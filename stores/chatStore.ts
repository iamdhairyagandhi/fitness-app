import {
    createConversation,
    deleteConversation,
    fetchConversations,
    fetchMessages,
    saveMessage,
    updateConversationTitle,
} from '@/lib/chatDb';
import type { ChatConversation, ChatMessage } from '@/types';
import { create } from 'zustand';

interface ChatState {
    conversations: ChatConversation[];
    activeConversationId: string | null;
    messages: ChatMessage[];
    isLoadingConversations: boolean;
    isLoadingMessages: boolean;

    loadConversations: (userId: string) => Promise<void>;
    startNewConversation: (userId: string, title?: string) => Promise<string | null>;
    openConversation: (conversationId: string) => Promise<void>;
    sendMessage: (role: 'user' | 'assistant', content: string, metadata?: Record<string, unknown>) => Promise<void>;
    deleteChat: (conversationId: string) => Promise<void>;
    renameChat: (conversationId: string, title: string) => Promise<void>;
    addLocalMessage: (message: ChatMessage) => void;
    clearActiveChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    conversations: [],
    activeConversationId: null,
    messages: [],
    isLoadingConversations: false,
    isLoadingMessages: false,

    loadConversations: async (userId) => {
        set({ isLoadingConversations: true });
        const conversations = await fetchConversations(userId);
        set({ conversations, isLoadingConversations: false });
    },

    startNewConversation: async (userId, title) => {
        const id = await createConversation(userId, title || 'New Chat');
        if (id) {
            set({
                activeConversationId: id,
                messages: [],
            });
            // Refresh list
            const conversations = await fetchConversations(userId);
            set({ conversations });
        }
        return id;
    },

    openConversation: async (conversationId) => {
        set({ isLoadingMessages: true, activeConversationId: conversationId });
        const messages = await fetchMessages(conversationId);
        set({ messages, isLoadingMessages: false });
    },

    sendMessage: async (role, content, metadata) => {
        const { activeConversationId } = get();
        if (!activeConversationId) return;
        await saveMessage(activeConversationId, role, content, metadata);
    },

    deleteChat: async (conversationId) => {
        await deleteConversation(conversationId);
        const state = get();
        set({
            conversations: state.conversations.filter((c) => c.id !== conversationId),
            ...(state.activeConversationId === conversationId
                ? { activeConversationId: null, messages: [] }
                : {}),
        });
    },

    renameChat: async (conversationId, title) => {
        await updateConversationTitle(conversationId, title);
        set({
            conversations: get().conversations.map((c) =>
                c.id === conversationId ? { ...c, title } : c,
            ),
        });
    },

    addLocalMessage: (message) => {
        set({ messages: [...get().messages, message] });
    },

    clearActiveChat: () => {
        set({ activeConversationId: null, messages: [] });
    },
}));
