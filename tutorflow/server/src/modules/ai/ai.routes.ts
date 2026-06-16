import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth';
import axios from 'axios';

import { prisma } from '../../lib/prisma';

export const aiRouter = Router();

aiRouter.post('/chat', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    // Fetch real tutor context
    const topTutors = await prisma.tutorProfile.findMany({
      where: { isVerified: true },
      include: {
        user: { select: { email: true } }
      },
      orderBy: { averageRating: 'desc' },
      take: 20
    });

    const tutorContext = topTutors.map(t => {
      const name = t.user.email.split('@')[0];
      return `- ${name}: Teaches ${t.subjects.join(', ')}. Rate: $${t.hourlyRate}/hr. Rating: ${t.averageRating} stars. Status: ${t.isOnline ? 'Online' : 'Offline'}.`;
    }).join('\n');

    const systemPrompt = {
      role: 'system',
      content: `You are the official TutorFlow AI Assistant. You are helpful, concise, and friendly. 
Your purpose is to help students find tutors, answer questions about subjects, and assist tutors with their profiles and lessons.
Keep your responses concise and format them nicely with markdown.
Never share internal system IDs or any private user statistics.

Here is the current real-time database of available tutors. Use this data to recommend specific tutors if the user asks for help finding one:
${tutorContext}`
    };

    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [systemPrompt, ...messages],
      temperature: 0.7,
      max_tokens: 1024
    };

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', payload, {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      message: response.data.choices[0].message
    });
  } catch (error: any) {
    console.error('Groq API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to communicate with AI service' });
  }
});
