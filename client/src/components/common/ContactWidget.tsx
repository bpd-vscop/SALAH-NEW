import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, ArrowLeft, Phone, Video, Mail, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminMessagesApi, messagesApi } from '../../api/messages';
import type { Conversation, Message } from '../../types/api';
import { cn } from '../../utils/cn';

// Contact data from footer
const contactPhones = ['+1-407-449-6740', '+1-407-452-7149', '+1-407-978-6077'];

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    height="200px"
    width="200px"
    version="1.1"
    id="Layer_1"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    viewBox="0 0 512 512"
    xmlSpace="preserve"
    fill="#ffffff"
    {...props}
  >
    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
    <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path
        style={{ fill: "#FEFEFE" }}
        d="M0,512l35.31-128C12.359,344.276,0,300.138,0,254.234C0,114.759,114.759,0,255.117,0 
        S512,114.759,512,254.234S395.476,512,255.117,512c-44.138,0-86.51-14.124-124.469-35.31L0,512z"
      ></path>
      <path
        style={{ fill: "#25D366" }}
        d="M137.71,430.786l7.945,4.414c32.662,20.303,70.621,32.662,110.345,32.662 
        c115.641,0,211.862-96.221,211.862-213.628S371.641,44.138,255.117,44.138S44.138,137.71,44.138,254.234 
        c0,40.607,11.476,80.331,32.662,113.876l5.297,7.945l-20.303,74.152L137.71,430.786z"
      ></path>
      <path
        style={{ fill: "#FEFEFE" }}
        d="M187.145,135.945l-16.772-0.883c-5.297,0-10.593,1.766-14.124,5.297 
        c-7.945,7.062-21.186,20.303-24.717,37.959c-6.179,26.483,3.531,58.262,26.483,90.041s67.09,82.979,144.772,105.048 
        c24.717,7.062,44.138,2.648,60.028-7.062c12.359-7.945,20.303-20.303,22.952-33.545l2.648-12.359 
        c0.883-3.531-0.883-7.945-4.414-9.71l-55.614-25.6c-3.531-1.766-7.945-0.883-10.593,2.648l-22.069,28.248 
        c-1.766,1.766-4.414,2.648-7.062,1.766c-15.007-5.297-65.324-26.483-92.69-79.448c-0.883-2.648-0.883-5.297,0.883-7.062 
        l21.186-23.834c1.766-2.648,2.648-6.179,1.766-8.828l-25.6-57.379C193.324,138.593,190.676,135.945,187.145,135.945"
      ></path>
    </g>
  </svg>
);

const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C9.91 21 3 14.09 3 6c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </svg>
);

// Array of icons for rotation
const rotatingIcons = [
  <PhoneIcon className="h-6 w-6" key="phone" />,
  <WhatsAppIcon className="h-6 w-6" key="whatsapp" />,
  <Mail className="h-6 w-6" key="email" />
];

interface ContactWidgetProps {
  showBackToTop?: boolean;
}

export function ContactWidget({ showBackToTop = false }: ContactWidgetProps) {
  const { user } = useAuth();
  const isSignedInClient = user?.role === 'client';
  const isStaffUser = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'staff';
  const [isOpen, setIsOpen] = useState(false);
  const [activeView, setActiveView] = useState<
    'none' | 'whatsapp' | 'email' | 'email-select' | 'chat' | 'chat-select' | 'staff-inbox'
  >('none');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [whatsappOpenTime, setWhatsappOpenTime] = useState<string>('');
  const [hasAnimatedMessage, setHasAnimatedMessage] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [currentIconIndex, setCurrentIconIndex] = useState(0);

  // Email form state
  const [emailForm, setEmailForm] = useState({
    name: '',
    email: '',
    phone: '',
    recipient: '',
    message: ''
  });
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [emailSuggestion, setEmailSuggestion] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    message: ''
  });

  const widgetRef = useRef<HTMLDivElement>(null);

  const recipients = useRef(['sales@ulk-supply.com', 'ulksupply@hotmail.com', 'bprod.digital@gmail.com']).current;

  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatUnreadByRecipient, setChatUnreadByRecipient] = useState<Record<string, number>>({});
  const [chatConversation, setChatConversation] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);

  const [staffUnreadCount, setStaffUnreadCount] = useState(0);
  const [staffConversations, setStaffConversations] = useState<Conversation[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffUnreadOnly, setStaffUnreadOnly] = useState(false);
  const [staffConversation, setStaffConversation] = useState<Conversation | null>(null);
  const [staffMessages, setStaffMessages] = useState<Message[]>([]);
  const [staffDraft, setStaffDraft] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSending, setStaffSending] = useState(false);
  const staffScrollRef = useRef<HTMLDivElement | null>(null);

  const refreshChatUnread = async () => {
    if (!isSignedInClient) return;
    try {
      const { conversations } = await messagesApi.listConversations();
      const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
      setChatUnreadCount(totalUnread);
      const map: Record<string, number> = {};
      conversations.forEach((c) => {
        const email = (c.recipientEmail || '').toLowerCase();
        if (!email) return;
        map[email] = (map[email] || 0) + (c.unreadCount ?? 0);
      });
      setChatUnreadByRecipient(map);
    } catch (error) {
      console.error('Failed to refresh chat unread count', error);
    }
  };

  const refreshStaffConversations = async () => {
    if (!isStaffUser) return;
    try {
      const { conversations } = await adminMessagesApi.listConversations();
      setStaffConversations(conversations);
      const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
      setStaffUnreadCount(totalUnread);
    } catch (error) {
      console.error('Failed to refresh staff conversations', error);
    }
  };

  const openChatForRecipient = async (recipientEmail: string) => {
    if (!isSignedInClient) return;
    setChatLoading(true);
    try {
      const { conversation } = await messagesApi.createConversation(recipientEmail);
      setChatConversation(conversation);
      const { messages } = await messagesApi.listMessages(conversation.id, { limit: 120 });
      setChatMessages(messages.slice().reverse());
      await messagesApi.markRead(conversation.id);
      await messagesApi.pingPresence(conversation.id);
      setChatUnreadCount((prev) => Math.max(0, prev - (conversation.unreadCount ?? 0)));
    } catch (error) {
      console.error(error);
      setEmailStatus('error');
    } finally {
      setChatLoading(false);
    }
  };

  const openStaffConversation = async (conversationId: string) => {
    if (!isStaffUser) return;
    setStaffLoading(true);
    try {
      const { conversation, messages } = await adminMessagesApi.listMessages(conversationId, { limit: 150 });
      setStaffConversation(conversation);
      setStaffMessages(messages.slice().reverse());
      await adminMessagesApi.markRead(conversationId);
      void refreshStaffConversations();
      requestAnimationFrame(() => {
        const el = staffScrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    } catch (error) {
      console.error('Failed to open staff conversation', error);
    } finally {
      setStaffLoading(false);
    }
  };

  const refreshChatMessages = async (conversationId: string) => {
    try {
      const { messages } = await messagesApi.listMessages(conversationId, { limit: 120 });
      setChatMessages(messages.slice().reverse());
      await messagesApi.markRead(conversationId);
    } catch (error) {
      console.error('Failed to refresh chat messages', error);
    }
  };

  const refreshStaffMessages = async (conversationId: string) => {
    try {
      const { messages } = await adminMessagesApi.listMessages(conversationId, { limit: 150 });
      setStaffMessages(messages.slice().reverse());
      await adminMessagesApi.markRead(conversationId);
      void refreshStaffConversations();
    } catch (error) {
      console.error('Failed to refresh staff messages', error);
    }
  };

  const handleChatSend = async () => {
    if (!isSignedInClient || !chatConversation) return;
    const body = chatDraft.trim();
    if (!body) return;
    try {
      setChatSending(true);
      const { message } = await messagesApi.sendMessage(chatConversation.id, body);
      setChatMessages((prev) => [...prev, message]);
      setChatDraft('');
      await refreshChatUnread();
    } catch (error) {
      console.error(error);
    } finally {
      setChatSending(false);
    }
  };

  const handleStaffSend = async () => {
    if (!isStaffUser || !staffConversation) return;
    const body = staffDraft.trim();
    if (!body) return;
    try {
      setStaffSending(true);
      const { message, conversation } = await adminMessagesApi.sendMessage(staffConversation.id, body);
      setStaffMessages((prev) => [...prev, message]);
      setStaffConversation(conversation);
      setStaffDraft('');
      void refreshStaffConversations();
      requestAnimationFrame(() => {
        const el = staffScrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    } catch (error) {
      console.error('Failed to send staff message', error);
    } finally {
      setStaffSending(false);
    }
  };

  // Email domains for autocomplete
  const emailDomains = [
    '@gmail.com',
    '@yahoo.com',
    '@outlook.com',
    '@hotmail.com',
    '@icloud.com',
    '@aol.com',
    '@protonmail.com',
    '@zoho.com',
    '@mail.com',
    '@yandex.com',
  ];

  // Icon rotation effect
  useEffect(() => {
    const iconInterval = setInterval(() => {
      setCurrentIconIndex((prevIndex) => (prevIndex + 1) % rotatingIcons.length);
    }, 2000); // Change icon every 2 seconds

    return () => clearInterval(iconInterval);
  }, []);

  useEffect(() => {
    if (!isSignedInClient) return;
    setEmailForm((prev) => ({
      ...prev,
      name: user?.name ?? prev.name,
      email: user?.email ?? prev.email,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedInClient, user?.id]);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      setIsOpen(false);
      if (detail?.view === 'chat') {
        setActiveView('chat-select');
      } else {
        setActiveView('email-select');
      }
    };

    window.addEventListener('openContactWidget', handleOpen as EventListener);
    return () => {
      window.removeEventListener('openContactWidget', handleOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    void refreshChatUnread();
    if (!isSignedInClient) return;
    const interval = setInterval(() => void refreshChatUnread(), 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedInClient]);

  useEffect(() => {
    void refreshStaffConversations();
    if (!isStaffUser) return;
    const interval = setInterval(() => void refreshStaffConversations(), 12000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaffUser]);

  useEffect(() => {
    if (activeView !== 'chat' || !isSignedInClient || !chatConversation?.id) return;
    const conversationId = chatConversation.id;
    void refreshChatMessages(conversationId);
    void messagesApi.pingPresence(conversationId);
    const interval = setInterval(() => void refreshChatMessages(conversationId), 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, isSignedInClient, chatConversation?.id]);

  useEffect(() => {
    if (activeView !== 'chat' || !isSignedInClient || !chatConversation?.id) return;
    const conversationId = chatConversation.id;
    const interval = setInterval(() => void messagesApi.pingPresence(conversationId), 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, isSignedInClient, chatConversation?.id]);

  useEffect(() => {
    if (activeView !== 'staff-inbox' || !isStaffUser || !staffConversation?.id) return;
    const conversationId = staffConversation.id;
    void refreshStaffMessages(conversationId);
    const interval = setInterval(() => void refreshStaffMessages(conversationId), 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, isStaffUser, staffConversation?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && activeView === 'none' && widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, activeView]);

  const getRandomPhone = () => {
    const randomIndex = Math.floor(Math.random() * contactPhones.length);
    return contactPhones[randomIndex];
  };

  const handleWhatsAppSend = () => {
    if (whatsappMessage.trim()) {
      const whatsappPhone = '+1 407-452-7149';
      const url = `https://wa.me/${whatsappPhone.replace(/[^+\d]/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
      window.open(url, '_blank');
      setWhatsappMessage('');
    }
  };

  const handleRandomPhoneCall = () => {
    const randomPhone = getRandomPhone();
    window.location.href = `tel:${randomPhone}`;
    resetState();
  };

  const handleEmailChange = (value: string) => {
    setEmailForm(prev => ({ ...prev, email: value }));
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: '' }));
    }

    // Show suggestion as user types
    if (!value) {
      setEmailSuggestion('');
    } else if (!value.includes('@')) {
      // Before @, suggest first domain
      setEmailSuggestion(value + '@gmail.com');
    } else if (!value.includes('.')) {
      // After @, suggest matching domain
      const afterAt = value.split('@')[1] || '';
      const suggestion = emailDomains.find(domain =>
        domain.toLowerCase().startsWith('@' + afterAt.toLowerCase())
      );
      if (suggestion) {
        setEmailSuggestion(value.split('@')[0] + suggestion);
      } else {
        setEmailSuggestion('');
      }
    } else {
      setEmailSuggestion('');
    }
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && emailSuggestion) {
      e.preventDefault();
      setEmailForm(prev => ({ ...prev, email: emailSuggestion }));
      setEmailSuggestion('');
    }
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^\d\s\-()+]/g, '');
    const formatted = cleaned.startsWith('+')
      ? '+' + cleaned.slice(1).replace(/\+/g, '')
      : cleaned.replace(/\+/g, '');
    setEmailForm(prev => ({ ...prev, phone: formatted }));
  };

  const clearFieldError = (field: 'name' | 'email' | 'message') => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleEmailSubmit = async () => {
    setFieldErrors({ name: '', email: '', message: '' });
    let hasErrors = false;
    const newErrors = { name: '', email: '', message: '' };

    if (!emailForm.name.trim()) {
      newErrors.name = 'Name is required';
      hasErrors = true;
    }

    if (!emailForm.email.trim()) {
      newErrors.email = 'Email is required';
      hasErrors = true;
    } else if (!emailForm.email.includes('@') || !emailForm.email.includes('.')) {
      newErrors.email = 'Please enter a valid email address';
      hasErrors = true;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailForm.email)) {
        newErrors.email = 'Please enter a valid email address';
        hasErrors = true;
      }
    }

    if (!emailForm.message.trim()) {
      newErrors.message = 'Message is required';
      hasErrors = true;
    }

    if (hasErrors) {
      setFieldErrors(newErrors);
      return;
    }

    setEmailSending(true);
    setEmailStatus('idle');

    try {
      if (isSignedInClient) {
        const recipient = emailForm.recipient.trim();
        if (!recipient) {
          setEmailStatus('error');
          return;
        }
        const { conversation } = await messagesApi.createConversation(recipient);
        setChatConversation(conversation);
        await messagesApi.sendMessage(conversation.id, emailForm.message);
        await refreshChatUnread();
        setEmailStatus('success');
        setTimeout(() => {
          setEmailStatus('idle');
          setEmailForm((prev) => ({ ...prev, phone: '', recipient: '', message: '' }));
          resetState();
        }, 1800);
      } else {
        const response = await fetch('/api/contact/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailForm),
        });

        if (response.ok) {
          setEmailStatus('success');
          setTimeout(() => {
            setEmailStatus('idle');
            setEmailForm({ name: '', email: '', phone: '', recipient: '', message: '' });
            resetState();
          }, 3000);
        } else {
          setEmailStatus('error');
        }
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailStatus('error');
    } finally {
      setEmailSending(false);
    }
  };

  const handleRecipientSelect = (recipient: string) => {
    setEmailForm(prev => ({ ...prev, recipient }));
    setActiveView('email');
  };

  const handleChatRecipientSelect = (recipient: string) => {
    setEmailForm((prev) => ({ ...prev, recipient }));
    setActiveView('chat');
    void openChatForRecipient(recipient);
  };

  const resetState = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsOpen(false);
    setActiveView('none');
  };
  
  const backToMenu = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveView('none');
    setIsOpen(true);
  };

  const toggleOpen = () => {
    if (isOpen) {
      setIsOpen(false);
      setActiveView('none');
    } else {
      setIsOpen(true);
    }
  };

  const handleWhatsAppOpen = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    setWhatsappOpenTime(timeString);
    
    if (!hasAnimatedMessage) {
      setShowTyping(true);
      setTimeout(() => {
        setShowTyping(false);
      }, 1500);
    }
    
    setActiveView('whatsapp');
  };

  const handleOptionClick = (action: () => void) => {
    setIsOpen(false);
    setTimeout(action, 300);
  };

  const options = [
    { icon: <Mail className="h-6 w-6 text-white" />, action: () => setActiveView('email-select'), key: 'email', label: isSignedInClient ? "Message" : "Email" },
    { icon: <WhatsAppIcon className="h-6 w-6 text-white" />, action: handleWhatsAppOpen, key: 'whatsapp', label: "WhatsApp" },
    { icon: <PhoneIcon className="h-6 w-6 text-white" />, action: handleRandomPhoneCall, key: 'call', label: "Call" },
  ];

  return (
    <motion.div
      className="fixed right-6 z-50"
      ref={widgetRef}
      initial={{ bottom: 24 }}
      animate={{
        bottom: showBackToTop ? 80 : 24
      }}
      transition={{
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1]
      }}
    >
      <div className="flex flex-col items-end gap-3">
        {isSignedInClient && (
          <button
            type="button"
            onClick={() => {
              if (activeView === 'chat' || activeView === 'chat-select') {
                resetState();
                return;
              }
              const unreadEntries = Object.entries(chatUnreadByRecipient).filter(([, count]) => count > 0);
              if (unreadEntries.length === 1) {
                const [recipientEmail] = unreadEntries[0];
                setActiveView('chat');
                void openChatForRecipient(recipientEmail);
                return;
              }
              if (unreadEntries.length > 1) {
                setActiveView('chat-select');
                return;
              }
              if (chatConversation?.recipientEmail) {
                setActiveView('chat');
                void openChatForRecipient(chatConversation.recipientEmail);
              } else {
                setActiveView('chat-select');
              }
            }}
            className="relative flex h-12 w-12 items-center justify-center rounded-full text-white shadow-2xl transition hover:scale-110"
            aria-label="Messages"
            style={{
              background: 'rgba(220, 38, 38, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(220, 38, 38, 0.4)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
            }}
          >
            <MessageCircle className="h-6 w-6 text-white" />
            {chatUnreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-700 px-1.5 text-[0.7rem] font-bold text-white">
                {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
              </span>
            ) : null}
          </button>
        )}

        {isStaffUser && (
          <button
            type="button"
            onClick={() => {
              if (activeView === 'staff-inbox') {
                resetState();
                return;
              }
              setActiveView('staff-inbox');
              setStaffConversation(null);
              void refreshStaffConversations();
            }}
            className="relative flex h-12 w-12 items-center justify-center rounded-full text-white shadow-2xl transition hover:scale-110"
            aria-label="Client messages"
            style={{
              background: 'rgba(220, 38, 38, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(220, 38, 38, 0.4)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
            }}
          >
            <MessageCircle className="h-6 w-6 text-white" />
            {staffUnreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-700 px-1.5 text-[0.7rem] font-bold text-white">
                {staffUnreadCount > 99 ? '99+' : staffUnreadCount}
              </span>
            ) : null}
          </button>
        )}

        <div className="relative flex h-16 items-center justify-end">

        <motion.div
          className="flex items-center justify-end rounded-full absolute right-0 overflow-hidden"
          initial={false}
          animate={{ width: isOpen ? 200 : 48, height: isOpen ? 64 : 48 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          style={{
            background: 'rgba(220, 38, 38, 0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
          }}
        >
          <div 
            className="w-full h-full flex items-center justify-end rounded-full"
            style={{
              background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
            }}
          >
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  className="flex items-center justify-evenly w-full px-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.2 } }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                >
                  {options.map((option) => (
                    <motion.button
                      key={option.key}
                      onClick={() => handleOptionClick(option.action)}
                      className="flex flex-col items-center gap-0.5 text-white transition-all duration-300 hover:scale-110 hover:brightness-125"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, scale: 0.5, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: 10 }}
                    >
                      <div className="w-6 h-6">{option.icon}</div>
                      <span className="text-[10px] font-medium text-white">{option.label}</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              onClick={toggleOpen}
              className="w-12 h-12 rounded-full text-white flex items-center justify-center shadow-2xl absolute right-0 transition-all duration-300 hover:scale-110"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 1, rotate: 0 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 45 }}
              style={{
                background: 'rgba(220, 38, 38, 0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(220, 38, 38, 0.4)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIconIndex}
                  initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {rotatingIcons[currentIconIndex]}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          )}
        </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {/* Recipient Selection View */}
        {(activeView === 'email-select' || activeView === 'chat-select') && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetState}
          >
            <motion.div
              className="w-[320px] flex flex-col fixed bottom-5 right-5 rounded-2xl overflow-hidden shadow-2xl bg-white"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 bg-red-700 text-white">
                <button onClick={backToMenu} className="p-1 hover:bg-red-600 rounded">
                  <ArrowLeft className="h-5 w-5"/>
                </button>
                <h3 className="font-semibold">Select Recipient</h3>
                <button onClick={resetState} className="p-1 hover:bg-red-600 rounded">
                  <X className="h-5 w-5"/>
                </button>
              </div>
              <div className="p-4 space-y-3">
                {recipients.map((email) => (
                  <button
                    key={email}
                    onClick={() =>
                      activeView === 'chat-select' ? handleChatRecipientSelect(email) : handleRecipientSelect(email)
                    }
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Mail className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-gray-800 truncate">{email}</span>
                    </div>
                    {chatUnreadByRecipient[email.toLowerCase()] ? (
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-700 px-2 text-[0.75rem] font-bold text-white">
                        {chatUnreadByRecipient[email.toLowerCase()] > 99 ? '99+' : chatUnreadByRecipient[email.toLowerCase()]}
                      </span>
                    ) : (
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-[0.75rem] text-gray-300">
                        &nbsp;
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Email Compose View */}
        {activeView === 'email' && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetState}
          >
            <motion.div
              className="w-[380px] flex flex-col fixed bottom-5 right-5 rounded-2xl overflow-hidden shadow-2xl max-h-[600px]"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(255, 255, 255, 0.82)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(220, 38, 38, 0.25)',
              }}
            >
              <div className="bg-red-700 text-white">
                <div className="flex items-center justify-between p-2">
                  <button onClick={() => setActiveView('email-select')} className="p-1 hover:bg-red-600 rounded">
                    <ArrowLeft className="h-5 w-5"/>
                  </button>
                  <h3 className="font-semibold">{isSignedInClient ? 'Send Message' : 'Send Email'}</h3>
                  <button onClick={resetState} className="p-1 hover:bg-red-600 rounded">
                    <X className="h-5 w-5"/>
                  </button>
                </div>
                {/* CENTERED HEADER CONTENT */}
                <div className="px-12 pb-2">
                  <div className="bg-red-800/50 border border-red-600/50 rounded-lg p-2 flex items-center justify-center gap-2">
                    <Mail className="h-4 w-4 text-white" />
                    <span className="text-sm font-medium text-white">
                      To: {emailForm.recipient}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto">

                {/* Name field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={emailForm.name}
                    onChange={(e) => {
                      setEmailForm(prev => ({ ...prev, name: e.target.value }));
                      clearFieldError('name');
                    }}
                    disabled={isSignedInClient && Boolean(user?.name)}
                    className={`w-full px-3.5 py-2.5 rounded-lg border ${fieldErrors.name ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900`}
                    placeholder="Your name"
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
                  )}
                </div>

                {/* Email field with CORRECTED Ghost Text Alignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <div className="relative bg-white rounded-lg group">
                    
                    {/* GHOST SUGGESTION LAYER */}
                    {emailSuggestion && emailForm.email && (
                      <div 
                        className="absolute inset-0 px-3.5 py-2.5 pointer-events-none flex items-center overflow-hidden whitespace-nowrap"
                        aria-hidden="true"
                      >
                        {/* Invisible spacer matching input text exactly */}
                        <span className="opacity-0 text-gray-900">
                          {emailForm.email}
                        </span>
                        
                        {/* Visible faint red suggestion */}
                        <span className="text-red-300/70">
                          {emailSuggestion.slice(emailForm.email.length)}
                        </span>
                      </div>
                    )}

                    {/* ACTUAL INPUT LAYER */}
                    <input
                      type="text"
                      value={emailForm.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      onKeyDown={handleEmailKeyDown}
                      disabled={isSignedInClient && Boolean(user?.email)}
                      className={`w-full px-3.5 py-2.5 rounded-lg border ${
                        fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 bg-transparent relative z-10 placeholder-gray-400`}
                      placeholder="your@email.com"
                      style={{ caretColor: 'black' }}
                      autoComplete="off"
                    />
                  </div>
                  
                  {emailSuggestion && (
                    <p className="text-xs text-gray-400 mt-1 pl-1">Press <span className="font-medium text-gray-600">Tab</span> to complete</p>
                  )}
                  {fieldErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Phone field (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                  <input
                    type="text"
                    value={emailForm.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                {/* Message field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                  <textarea
                    value={emailForm.message}
                    onChange={(e) => {
                      setEmailForm(prev => ({ ...prev, message: e.target.value }));
                      clearFieldError('message');
                    }}
                    rows={4}
                    className={`w-full px-3.5 py-2.5 rounded-lg border ${fieldErrors.message ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-red-500 resize-none text-gray-900`}
                    placeholder="Your message..."
                  />
                  {fieldErrors.message && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.message}</p>
                  )}
                </div>

                <button
                  onClick={handleEmailSubmit}
                  disabled={emailSending}
                  className="w-full bg-red-700 hover:bg-red-800 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {emailSending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      {isSignedInClient ? 'Send Message' : 'Send Email'}
                    </>
                  )}
                </button>

                {emailStatus === 'error' && (
                  <p className="text-sm text-red-600 text-center">
                    {isSignedInClient ? 'Failed to send message. Please try again.' : 'Failed to send email. Please try again.'}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Chat View (Signed-in clients) */}
        {activeView === 'chat' && isSignedInClient && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetState}
          >
            <motion.div
              className="w-[380px] flex flex-col fixed bottom-5 right-5 rounded-2xl overflow-hidden shadow-2xl max-h-[600px]"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(255, 255, 255, 0.82)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(220, 38, 38, 0.25)',
              }}
            >
              <div className="bg-red-700 text-white">
                <div className="flex items-center justify-between p-2">
                  <button onClick={() => setActiveView('chat-select')} className="p-1 hover:bg-red-600 rounded">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h3 className="font-semibold">Messages</h3>
                  <button onClick={resetState} className="p-1 hover:bg-red-600 rounded">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="px-12 pb-2">
                  <div className="bg-red-800/50 border border-red-600/50 rounded-lg p-2 flex items-center justify-center gap-2">
                    <Mail className="h-4 w-4 text-white" />
                    <span className="text-sm font-medium text-white">
                      To: {chatConversation?.recipientEmail ?? emailForm.recipient}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white/20">
                {chatLoading ? (
                  <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                    <div className="w-5 h-5 border-2 border-red-700 border-t-transparent rounded-full animate-spin mr-2" />
                    Loading…
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-500">No messages yet. Say hi!</div>
                ) : (
                  chatMessages.map((msg) => {
                    const mine = msg.senderRole === 'client';
                    return (
                      <div key={msg.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[85%] rounded-2xl border px-3 py-2 text-sm shadow-sm whitespace-pre-wrap backdrop-blur',
                            mine
                              ? 'border-red-200/60 bg-white/70 text-gray-900'
                              : 'border-white/60 bg-red-50/70 text-gray-900'
                          )}
                        >
                          {msg.body}
                          <div className="mt-1 text-right text-[0.7rem] text-gray-600">
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-white/50 bg-white/55 p-3 backdrop-blur-xl">
                <div className="flex gap-2">
                  <textarea
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                    rows={2}
                    placeholder="Type a message…"
                    className="flex-1 resize-none rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={chatSending || chatLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleChatSend();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleChatSend()}
                    disabled={chatSending || chatLoading || !chatDraft.trim()}
                    className="h-11 w-11 rounded-xl bg-red-700 text-white flex items-center justify-center disabled:bg-gray-300 transition-colors hover:bg-red-800"
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-2 text-[11px] text-gray-600">Enter to send • Shift+Enter for new line</div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Staff/Admin Inbox */}
        {activeView === 'staff-inbox' && isStaffUser && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetState}
          >
            <motion.div
              className="w-[420px] flex flex-col fixed bottom-5 right-5 rounded-2xl overflow-hidden shadow-2xl max-h-[650px]"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(255, 255, 255, 0.82)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(220, 38, 38, 0.25)',
              }}
            >
              <div className="bg-red-700 text-white">
                <div className="flex items-center justify-between p-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (staffConversation) {
                        setStaffConversation(null);
                        return;
                      }
                      backToMenu(e);
                    }}
                    className="p-1 hover:bg-red-600 rounded"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h3 className="font-semibold">{staffConversation ? 'Conversation' : 'Messages'}</h3>
                  <button onClick={resetState} className="p-1 hover:bg-red-600 rounded">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {staffConversation ? (
                  <div className="px-4 pb-3">
                    <div className="flex items-center justify-between rounded-lg bg-red-800/40 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {staffConversation.client?.name || staffConversation.client?.email || 'Client'}
                        </div>
                        <div className="truncate text-[12px] text-white/80">
                          {staffConversation.client?.email ? staffConversation.client.email : staffConversation.clientId} • To:{' '}
                          {staffConversation.recipientEmail}
                        </div>
                      </div>
                      <span className="ml-3 inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
                        {staffConversation.status}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 pb-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        placeholder="Search clients, email…"
                        className="h-10 flex-1 rounded-lg border border-white/20 bg-white/15 px-3 text-sm text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/40"
                      />
                      <div className="flex items-center gap-2 text-sm text-white/90">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={staffUnreadOnly}
                          onClick={() => setStaffUnreadOnly((prev) => !prev)}
                          className={cn(
                            'relative inline-flex h-6 w-11 items-center rounded-full border transition',
                            staffUnreadOnly ? 'border-white/60 bg-white/40' : 'border-white/30 bg-white/15'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition',
                              staffUnreadOnly ? 'translate-x-5' : 'translate-x-1'
                            )}
                          />
                        </button>
                        <span>Unread</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!staffConversation ? (
                <div className="flex-1 overflow-y-auto bg-white/20">
                  {staffLoading ? (
                    <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                      <div className="w-5 h-5 border-2 border-red-700 border-t-transparent rounded-full animate-spin mr-2" />
                      Loading…
                    </div>
                  ) : (
                    <div className="divide-y divide-white/40">
                      {staffConversations
                        .slice()
                        .sort((a, b) => {
                          const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
                          const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
                          return bt - at;
                        })
                        .filter((c) => {
                          if (staffUnreadOnly && !(c.unreadCount && c.unreadCount > 0)) return false;
                          const q = staffSearch.trim().toLowerCase();
                          if (!q) return true;
                          const hay = [
                            c.client?.name,
                            c.client?.email,
                            c.recipientEmail,
                            c.lastMessagePreview,
                          ]
                            .filter(Boolean)
                            .join(' ')
                            .toLowerCase();
                          return hay.includes(q);
                        })
                        .map((c) => {
                          const clientName = c.client?.name || c.client?.email || 'Client';
                          const fromEmail = c.client?.email || '—';
                          const lastFromClient = c.lastMessageSenderRole === 'client';
                          const timeLabel = c.lastMessageAt
                            ? new Date(c.lastMessageAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '';

                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => void openStaffConversation(c.id)}
                              className="relative w-full px-4 py-3 text-left hover:bg-red-50/60 transition-colors"
                            >
                              <div className="pr-20">
                                <div className="truncate text-[11px] text-gray-500">
                                  Email: <span className="text-gray-700">{fromEmail}</span>{' '}
                                  <span className="mx-1 text-gray-300">→</span>{' '}
                                  <span className="text-gray-700">{c.recipientEmail}</span>
                                </div>

                                <div className="mt-0.5 flex items-center gap-2">
                                  <div className="truncate font-semibold text-gray-900">{clientName}</div>
                                  {c.unreadCount && c.unreadCount > 0 ? (
                                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-semibold text-white">
                                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="mt-1 flex min-w-0 items-start gap-2">
                                  <span
                                    className={cn(
                                      'shrink-0 text-xs font-semibold',
                                      lastFromClient ? 'text-emerald-700' : 'text-violet-700'
                                    )}
                                  >
                                    {lastFromClient ? 'Received' : 'Sent'}
                                  </span>
                                  <span className="truncate text-sm text-gray-700">{c.lastMessagePreview || '—'}</span>
                                </div>
                              </div>

                              <div className="absolute bottom-3 right-4 text-right text-xs text-gray-400">{timeLabel}</div>
                            </button>
                          );
                        })}
                      {staffConversations.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-500">No conversations yet.</div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div ref={staffScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-white/20">
                    {staffLoading ? (
                      <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                        <div className="w-5 h-5 border-2 border-red-700 border-t-transparent rounded-full animate-spin mr-2" />
                        Loading…
                      </div>
                    ) : staffMessages.length === 0 ? (
                      <div className="py-10 text-center text-sm text-gray-500">No messages yet.</div>
                    ) : (
                      staffMessages.map((msg) => {
                        const mine = msg.senderRole === 'admin';
                        return (
                          <div key={msg.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                            <div
                              className={cn(
                                'max-w-[85%] rounded-2xl border px-3 py-2 text-sm shadow-sm whitespace-pre-wrap backdrop-blur',
                                mine
                                  ? 'border-red-200/60 bg-red-50/70 text-gray-900'
                                  : 'border-white/70 bg-white/65 text-gray-900'
                              )}
                            >
                              {msg.body}
                              <div className="mt-1 text-right text-[0.7rem] text-gray-500">
                                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t border-white/50 bg-white/55 p-3 backdrop-blur-xl">
                    <div className="flex gap-2">
                      <textarea
                        value={staffDraft}
                        onChange={(e) => setStaffDraft(e.target.value)}
                        rows={2}
                        placeholder="Reply…"
                        className="flex-1 resize-none rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                        disabled={staffSending || staffLoading}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            void handleStaffSend();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => void handleStaffSend()}
                        disabled={staffSending || staffLoading || !staffDraft.trim()}
                        className="h-11 w-11 rounded-xl bg-red-700 text-white flex items-center justify-center disabled:bg-gray-300 transition-colors hover:bg-red-800"
                        aria-label="Send reply"
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-2 text-[11px] text-gray-600">Enter to send • Shift+Enter for new line</div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* WhatsApp View */}
        {activeView === 'whatsapp' && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetState}
          >
            <motion.div
              className="w-[320px] h-[500px] flex flex-col fixed bottom-5 right-5 rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: '#0b141a' }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              <header className="flex items-center p-3" style={{ backgroundColor: '#202c33' }}>
                <button onClick={backToMenu} className="mr-2 p-1 text-gray-300 hover:bg-gray-600 rounded">
                  <ArrowLeft className="h-5 w-5"/>
                </button>
                
                <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center mr-3 overflow-hidden">
                  <span className="text-white font-semibold">ULK</span>
                </div>
                
                <div className="flex-grow">
                  <h3 className="font-medium text-white text-sm">ULK Supply Support</h3>
                  <p className="text-xs" style={{ color: '#8696a0' }}>Online</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="text-gray-300 hover:bg-gray-600 w-8 h-8 rounded p-1">
                    <Video className="h-4 w-4"/>
                  </button>
                  <button className="text-gray-300 hover:bg-gray-600 w-8 h-8 rounded p-1">
                    <Phone className="h-4 w-4"/>
                  </button>
                </div>
              </header>

              <div 
                className="flex-grow p-4 space-y-3 overflow-y-auto"
                style={{ 
                  backgroundColor: '#0b141a',
                  backgroundImage: `url("data:image/svg+xml,%3csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' fill-rule='evenodd'%3e%3cg fill='%23182229' fill-opacity='0.1'%3e%3cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e")` 
                }}
              >
                <div className="flex justify-center">
                  <div className="bg-gray-700 px-3 py-1 rounded-full">
                    <p className="text-xs text-gray-300">Today</p>
                  </div>
                </div>
                
                <AnimatePresence>
                  {showTyping && (
                    <motion.div 
                      className="flex"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div 
                        className="bg-gray-700 p-3 rounded-lg rounded-tl-none"
                        style={{ backgroundColor: '#202c33' }}
                      >
                        <div className="flex items-center space-x-1">
                          <div className="flex space-x-1">
                            <motion.div 
                              className="w-2 h-2 bg-gray-400 rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                            />
                            <motion.div 
                              className="w-2 h-2 bg-gray-400 rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                            />
                            <motion.div 
                              className="w-2 h-2 bg-gray-400 rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div 
                  className="flex"
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    transition: { 
                      duration: 0.6, 
                      delay: hasAnimatedMessage ? 0 : 1.6,
                      ease: "easeOut"
                    }
                  }}
                  onAnimationComplete={() => {
                    if (!hasAnimatedMessage) {
                      setHasAnimatedMessage(true);
                    }
                  }}
                >
                  <div 
                    className="bg-gray-700 p-3 rounded-lg max-w-xs rounded-tl-none"
                    style={{ backgroundColor: '#202c33' }}
                  >
                    <p className="text-sm text-white">
                      Hello! 👋 Welcome to ULK Supply Support. How can we help you today?
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#8696a0' }}>
                      {whatsappOpenTime || new Date().toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </p>
                  </div>
                </motion.div>
              </div>

              <footer className="p-3 flex items-center gap-2" style={{ backgroundColor: '#202c33' }}>
                <div className="flex-grow relative">
                  <input 
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    placeholder="Type a message" 
                    className="w-full bg-gray-700 border-none text-white placeholder:text-gray-400 pr-12 rounded-full px-4 py-2 focus:outline-none"
                    style={{ backgroundColor: '#2a3942' }}
                    onKeyDown={(e) => e.key === 'Enter' && handleWhatsAppSend()}
                  />
                </div>
                <button 
                  onClick={handleWhatsAppSend} 
                  className="rounded-full w-10 h-10 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <Send className="h-5 w-5"/>
                </button>
              </footer>
            </motion.div>
          </motion.div>
        )}

        {/* Success Popup */}
        {emailStatus === 'success' && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-md mx-4 text-center"
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <motion.div
                className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <motion.svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </motion.svg>
              </motion.div>

              <motion.h3
                className="text-2xl font-bold text-gray-900 mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Email Sent Successfully!
              </motion.h3>

              <motion.p
                className="text-gray-600 mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Thank you for contacting us. We'll get back to you shortly.
              </motion.p>

              <motion.div
                className="flex justify-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-red-600 rounded-full"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </motion.div>

              <motion.p
                className="text-xs text-gray-500 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Closing automatically...
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
