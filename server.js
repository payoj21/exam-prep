const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/examplatform', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    authProvider: { type: String, enum: ['google', 'apple'], required: true },
    providerId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now }
});

// Mock Test Attempt Schema
const attemptSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examType: { type: String, required: true },
    subjects: [String],
    difficulty: { type: String, required: true },
    questions: [{
        id: String,
        question: String,
        subject: String,
        correctAnswer: Number,
        userAnswer: Number,
        isCorrect: Boolean,
        timeTaken: Number
    }],
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    correct: { type: Number, required: true },
    incorrect: { type: Number, required: true },
    unanswered: { type: Number, required: true },
    timeTaken: { type: Number, required: true }, // in seconds
    completedAt: { type: Date, default: Date.now }
});

// Topic Strength Schema
const topicStrengthSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examType: { type: String, required: true },
    subject: { type: String, required: true },
    topicBreakdown: [{
        topic: String,
        correct: Number,
        total: Number,
        accuracy: Number
    }],
    overallAccuracy: { type: Number, required: true },
    lastUpdated: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Attempt = mongoose.model('Attempt', attemptSchema);
const TopicStrength = mongoose.model('TopicStrength', topicStrengthSchema);

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Auth Routes
app.post('/api/auth/google', async (req, res) => {
    try {
        const { idToken } = req.body;

        // Verify Google token
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub: providerId, email, name } = payload;

        // Find or create user
        let user = await User.findOne({ email, authProvider: 'google' });
        
        if (!user) {
            user = await User.create({
                email,
                name,
                authProvider: 'google',
                providerId,
            });
        } else {
            user.lastLogin = new Date();
            await user.save();
        }

        // Generate JWT
        const accessToken = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
            accessToken,
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

app.post('/api/auth/apple', async (req, res) => {
    try {
        const { identityToken, user: appleUser } = req.body;

        // In production, verify Apple token here
        // For now, we'll accept the token and extract user info
        
        const email = appleUser.email;
        const name = appleUser.name ? `${appleUser.name.firstName} ${appleUser.name.lastName}` : email;
        const providerId = appleUser.sub || appleUser.user;

        // Find or create user
        let user = await User.findOne({ email, authProvider: 'apple' });
        
        if (!user) {
            user = await User.create({
                email,
                name,
                authProvider: 'apple',
                providerId,
            });
        } else {
            user.lastLogin = new Date();
            await user.save();
        }

        // Generate JWT
        const accessToken = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
            accessToken,
        });
    } catch (error) {
        console.error('Apple auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user._id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// API endpoint to generate questions
app.post('/api/generate-questions', authenticateToken, async (req, res) => {
    try {
        const { examType, subject, count, difficulty } = req.body;

        if (!examType || !subject || !count || !difficulty) {
            return res.status(400).json({ 
                error: 'Missing required fields: examType, subject, count, difficulty' 
            });
        }

        const examConfigs = {
            jee: {
                name: 'JEE Main',
                subjects: {
                    physics: 'Physics',
                    chemistry: 'Chemistry',
                    mathematics: 'Mathematics'
                },
                context: 'JEE Main (Joint Entrance Examination)'
            },
            neet: {
                name: 'NEET',
                subjects: {
                    physics: 'Physics',
                    chemistry: 'Chemistry',
                    biology: 'Biology',
                    zoology: 'Zoology',
                    botany: 'Botany'
                },
                context: 'NEET (National Eligibility cum Entrance Test) for medical entrance'
            },
            ssc: {
                name: 'SSC',
                subjects: {
                    reasoning: 'General Intelligence & Reasoning',
                    quantitative: 'Quantitative Aptitude',
                    english: 'English Language',
                    gk: 'General Knowledge & Current Affairs'
                },
                context: 'SSC (Staff Selection Commission) examinations'
            }
        };

        const config = examConfigs[examType];
        const subjectName = config.subjects[subject];

        const prompt = `Generate exactly ${count} ${config.context} level ${difficulty} difficulty multiple choice questions for ${subjectName}.

For each question, provide:
1. A clear, concise question statement
2. Exactly 4 options (A, B, C, D)
3. Mark which option is correct
4. Specify the topic/concept being tested

Format your response as a JSON array of objects with this exact structure:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "topic": "Topic name (e.g., Mechanics, Organic Chemistry, Algebra)"
  }
]

The "correct" field should be the index (0-3) of the correct option.

Requirements:
- Questions should be at ${config.name} ${difficulty} difficulty level
- Cover diverse topics in ${subjectName}
- Make options realistic and challenging
- Specify clear topic names for analytics
- Avoid overly simple or trick questions
- Use proper notation and units where applicable
${examType === 'neet' ? '- Focus on NCERT syllabus and concepts\n- Include questions on human anatomy, physiology, genetics, ecology, etc.' : ''}
${examType === 'ssc' ? '- Include practical and application-based questions\n- Cover current affairs for GK questions if applicable' : ''}

Return ONLY the JSON array, no additional text.`;

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            messages: [
                { role: 'user', content: prompt }
            ],
        });

        const content = message.content[0].text;
        
        let jsonStr = content.trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.substring(7);
        }
        if (jsonStr.endsWith('```')) {
            jsonStr = jsonStr.substring(0, jsonStr.length - 3);
        }
        jsonStr = jsonStr.trim();

        const questionsData = JSON.parse(jsonStr);
        
        const questions = questionsData.map((q, index) => ({
            id: `${subject}_${index + 1}`,
            question: q.question,
            options: q.options,
            correctAnswer: q.correct,
            topic: q.topic || 'General',
            subject: subject,
            marks: 4,
            type: 'single'
        }));

        res.json({ questions });

    } catch (error) {
        console.error('Error generating questions:', error);
        res.status(500).json({ 
            error: 'Failed to generate questions',
            details: error.message 
        });
    }
});

// Submit exam attempt
app.post('/api/attempts', authenticateToken, async (req, res) => {
    try {
        const { examType, subjects, difficulty, questions, score, maxScore, correct, incorrect, unanswered, timeTaken } = req.body;

        const attempt = await Attempt.create({
            userId: req.user.userId,
            examType,
            subjects,
            difficulty,
            questions,
            score,
            maxScore,
            correct,
            incorrect,
            unanswered,
            timeTaken,
        });

        // Update topic strengths
        await updateTopicStrengths(req.user.userId, examType, questions);

        res.json({ success: true, attemptId: attempt._id });
    } catch (error) {
        console.error('Submit attempt error:', error);
        res.status(500).json({ error: 'Failed to submit attempt' });
    }
});

// Get user's attempt history
app.get('/api/attempts', authenticateToken, async (req, res) => {
    try {
        const { examType, limit = 20, skip = 0 } = req.query;

        const filter = { userId: req.user.userId };
        if (examType) {
            filter.examType = examType;
        }

        const attempts = await Attempt.find(filter)
            .sort({ completedAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .select('-questions.question -questions.options'); // Don't send full questions

        const total = await Attempt.countDocuments(filter);

        res.json({ attempts, total });
    } catch (error) {
        console.error('Get attempts error:', error);
        res.status(500).json({ error: 'Failed to get attempts' });
    }
});

// Get specific attempt details
app.get('/api/attempts/:id', authenticateToken, async (req, res) => {
    try {
        const attempt = await Attempt.findOne({
            _id: req.params.id,
            userId: req.user.userId
        });

        if (!attempt) {
            return res.status(404).json({ error: 'Attempt not found' });
        }

        res.json(attempt);
    } catch (error) {
        console.error('Get attempt error:', error);
        res.status(500).json({ error: 'Failed to get attempt' });
    }
});

// Get leaderboard
app.get('/api/leaderboard', authenticateToken, async (req, res) => {
    try {
        const { examType, period = 'all' } = req.query;

        let dateFilter = {};
        if (period === 'week') {
            dateFilter = { completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
        } else if (period === 'month') {
            dateFilter = { completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
        }

        const filter = examType ? { examType, ...dateFilter } : dateFilter;

        const leaderboard = await Attempt.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$userId',
                    totalScore: { $sum: '$score' },
                    averageScore: { $avg: '$score' },
                    totalAttempts: { $sum: 1 },
                    bestScore: { $max: '$score' },
                    totalCorrect: { $sum: '$correct' },
                    totalQuestions: { $sum: { $add: ['$correct', '$incorrect', '$unanswered'] } },
                }
            },
            { $sort: { totalScore: -1 } },
            { $limit: 100 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    userId: '$_id',
                    name: '$user.name',
                    email: '$user.email',
                    totalScore: 1,
                    averageScore: { $round: ['$averageScore', 2] },
                    totalAttempts: 1,
                    bestScore: 1,
                    accuracy: { 
                        $round: [
                            { $multiply: [{ $divide: ['$totalCorrect', '$totalQuestions'] }, 100] },
                            2
                        ]
                    }
                }
            }
        ]);

        // Add rank
        const leaderboardWithRank = leaderboard.map((entry, index) => ({
            ...entry,
            rank: index + 1
        }));

        res.json({ leaderboard: leaderboardWithRank });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// Get user's analytics
app.get('/api/analytics', authenticateToken, async (req, res) => {
    try {
        const { examType } = req.query;

        const filter = { userId: req.user.userId };
        if (examType) {
            filter.examType = examType;
        }

        const topicStrengths = await TopicStrength.find(filter);

        // Get overall stats
        const overallStats = await Attempt.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalAttempts: { $sum: 1 },
                    averageScore: { $avg: '$score' },
                    totalCorrect: { $sum: '$correct' },
                    totalIncorrect: { $sum: '$incorrect' },
                    totalQuestions: { $sum: { $add: ['$correct', '$incorrect', '$unanswered'] } },
                    averageTime: { $avg: '$timeTaken' },
                }
            }
        ]);

        // Get subject-wise performance
        const subjectPerformance = await Attempt.aggregate([
            { $match: filter },
            { $unwind: '$questions' },
            {
                $group: {
                    _id: '$questions.subject',
                    correct: { $sum: { $cond: ['$questions.isCorrect', 1, 0] } },
                    total: { $sum: 1 },
                }
            },
            {
                $project: {
                    subject: '$_id',
                    correct: 1,
                    total: 1,
                    accuracy: { 
                        $round: [
                            { $multiply: [{ $divide: ['$correct', '$total'] }, 100] },
                            2
                        ]
                    }
                }
            }
        ]);

        // Get difficulty-wise performance
        const difficultyPerformance = await Attempt.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$difficulty',
                    averageScore: { $avg: '$score' },
                    attempts: { $sum: 1 },
                }
            }
        ]);

        // Get progress over time
        const progressOverTime = await Attempt.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: {
                        year: { $year: '$completedAt' },
                        month: { $month: '$completedAt' },
                        day: { $dayOfMonth: '$completedAt' }
                    },
                    averageScore: { $avg: '$score' },
                    attempts: { $sum: 1 },
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
            { $limit: 30 }
        ]);

        res.json({
            overallStats: overallStats[0] || {},
            topicStrengths,
            subjectPerformance,
            difficultyPerformance,
            progressOverTime,
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// Helper function to update topic strengths
async function updateTopicStrengths(userId, examType, questions) {
    const topicMap = new Map();

    questions.forEach(q => {
        const key = `${q.subject}_${q.topic || 'General'}`;
        if (!topicMap.has(key)) {
            topicMap.set(key, { subject: q.subject, topic: q.topic || 'General', correct: 0, total: 0 });
        }
        const topic = topicMap.get(key);
        topic.total++;
        if (q.isCorrect) {
            topic.correct++;
        }
    });

    for (const [key, data] of topicMap) {
        await TopicStrength.findOneAndUpdate(
            {
                userId,
                examType,
                subject: data.subject,
            },
            {
                $set: {
                    lastUpdated: new Date(),
                },
                $push: {
                    topicBreakdown: {
                        topic: data.topic,
                        correct: data.correct,
                        total: data.total,
                        accuracy: (data.correct / data.total) * 100,
                    }
                }
            },
            { upsert: true }
        );
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 Exam Platform API with Auth ready`);
});
