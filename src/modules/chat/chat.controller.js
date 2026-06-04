import MessageThread from './chat.model.js';
import Document from '../documents/doc.model.js';
import User from '../../models/User.js';
import { sendSuccess } from '../../utils/responseHandler.js';
import AppError from '../../utils/AppError.js';

const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * @desc    Get all chat threads for the logged-in user in their workspace
 * @route   GET /api/chat/threads
 * @access  Private
 */
export const getThreads = catchAsync(async (req, res, next) => {
  const threads = await MessageThread.find({
    userId: req.user._id,
    workspaceId: req.user.workspaceId
  }).sort({ updatedAt: -1 });

  sendSuccess(res, 200, { threads });
});

/**
 * @desc    Create a new chat conversation thread
 * @route   POST /api/chat/threads
 * @access  Private
 */
export const createThread = catchAsync(async (req, res, next) => {
  const { title } = req.body;

  const thread = await MessageThread.create({
    title: title || 'New conversation',
    userId: req.user._id,
    workspaceId: req.user.workspaceId,
    messages: []
  });

  sendSuccess(res, 201, { thread }, 'Chat conversation started successfully');
});

/**
 * @desc    Get details and message history of a specific chat thread
 * @route   GET /api/chat/threads/:id
 * @access  Private
 */
export const getThreadDetails = catchAsync(async (req, res, next) => {
  const thread = await MessageThread.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!thread) {
    return next(new AppError('Conversation thread not found or unauthorized', 404));
  }

  sendSuccess(res, 200, { thread });
});

/**
 * @desc    Post a new user message, trigger semantic retrieval, generate RAG response, and log conversation
 * @route   POST /api/chat/threads/:id/messages
 * @access  Private
 */
export const postMessage = catchAsync(async (req, res, next) => {
  const { text } = req.body;
  const threadId = req.params.id;

  if (!text || !text.trim()) {
    return next(new AppError('Message content cannot be empty', 400));
  }

  // 1. Locate and verify ownership of the thread
  const thread = await MessageThread.findOne({
    _id: threadId,
    userId: req.user._id
  });

  if (!thread) {
    return next(new AppError('Conversation thread not found or unauthorized', 404));
  }

  // 2. Resolve Workspace RLS Boundary: Retrieve all documents belonging to any user in this workspace
  const workspaceUsers = await User.find({ workspaceId: req.user.workspaceId }, '_id');
  const userIds = workspaceUsers.map(u => u._id);
  
  // Get all documents that have finished processing in the workspace
  const documents = await Document.find({
    ownerId: { $in: userIds },
    status: 'Ready'
  }, '_id');
  
  const allowedDocIds = documents.map(doc => doc._id.toString());

  // 3. Format message history for RAG (Gemini context)
  const history = thread.messages.map(msg => ({
    role: msg.role,
    text: msg.text
  }));

  // 4. Hit dedicated Python FastAPI RAG chat service
  let assistantText = "I encountered an error processing your query.";
  let citations = [];

  try {
    const response = await fetch(`${AI_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_text: text,
        allowed_document_ids: allowedDocIds,
        history,
        top_k: 5
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('FastAPI RAG service error:', errBody);
      throw new Error(`FastAPI service error: ${response.statusText}`);
    }

    const payload = await response.json();
    if (payload.status === 'success') {
      assistantText = payload.text;
      citations = payload.citations || [];
    }
  } catch (error) {
    console.error('AI RAG handshake collapsed:', error.message);
    return next(new AppError(`AI service handshake failure: ${error.message}`, 502));
  }

  // 5. Append messages to thread
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Add User Message
  thread.messages.push({
    role: 'user',
    text: text.trim(),
    time: now,
    citations: []
  });

  // Add Assistant Message
  const assistantMsgIdx = thread.messages.push({
    role: 'assistant',
    text: assistantText,
    time: now,
    citations: citations.map(c => ({
      doc: c.doc,
      page: c.page,
      quote: c.quote
    }))
  }) - 1;

  // Update thread title if this was the very first user message
  if (thread.messages.length <= 2 && text.trim().length <= 50) {
    thread.title = text.trim();
  } else if (thread.messages.length <= 2) {
    thread.title = text.trim().substring(0, 47) + '...';
  }

  await thread.save();

  // Return the newly added assistant response message (including citations)
  sendSuccess(res, 201, {
    message: thread.messages[assistantMsgIdx],
    threadTitle: thread.title
  }, 'AI response generated successfully');
});

/**
 * @desc    Delete a conversation thread
 * @route   DELETE /api/chat/threads/:id
 * @access  Private
 */
export const deleteThread = catchAsync(async (req, res, next) => {
  const thread = await MessageThread.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!thread) {
    return next(new AppError('Conversation thread not found or unauthorized', 404));
  }

  sendSuccess(res, 200, { threadId: thread._id }, 'Conversation thread deleted successfully');
});
