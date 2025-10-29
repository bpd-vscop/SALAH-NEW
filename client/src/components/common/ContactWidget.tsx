import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, ArrowLeft, Phone, Video, Mail } from 'lucide-react';

// Contact data from footer
const contactPhones = ['+1-407-449-6740', '+1-407-452-7149', '+1-407-978-6077'];
const contactEmails = ['sales@ulk-supply.com', 'ulksupply@hotmail.com'];

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
  <PhoneIcon className="h-5 w-5" key="phone" />,
  <WhatsAppIcon className="h-5 w-5" key="whatsapp" />,
  <Mail className="h-5 w-5" key="email" />
];

export function ContactWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeView, setActiveView] = useState<'none' | 'whatsapp' | 'email' | 'email-select'>('none');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [whatsappOpenTime, setWhatsappOpenTime] = useState<string>('');
  const [hasAnimatedMessage, setHasAnimatedMessage] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [currentIconIndex, setCurrentIconIndex] = useState(0);

  const widgetRef = useRef<HTMLDivElement>(null);

  // Icon rotation effect
  useEffect(() => {
    const iconInterval = setInterval(() => {
      setCurrentIconIndex((prevIndex) => (prevIndex + 1) % rotatingIcons.length);
    }, 2000); // Change icon every 2 seconds

    return () => clearInterval(iconInterval);
  }, []);

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

  const handleEmailSend = (email: string) => {
    const subject = encodeURIComponent('Contact from ULK Supply Website');
    const body = encodeURIComponent('Hello, I would like to get in touch with you.');
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    resetState();
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
    { icon: <Mail className="h-4 w-4 text-white" />, action: () => setActiveView('email-select'), key: 'email', label: "Email" },
    { icon: <WhatsAppIcon className="h-4 w-4 text-white" />, action: handleWhatsAppOpen, key: 'whatsapp', label: "WhatsApp" },
    { icon: <PhoneIcon className="h-4 w-4 text-white" />, action: handleRandomPhoneCall, key: 'call', label: "Call" },
  ];

  return (
    <div className="fixed bottom-20 right-6 z-50" ref={widgetRef}>
      <div className="relative flex items-center justify-end h-12">
        
        <motion.div
          className="flex items-center justify-end rounded-full absolute right-0 overflow-hidden"
          initial={false}
          animate={{ width: isOpen ? 200 : 48, height: 48 }}
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
                      <div className="w-4 h-4">{option.icon}</div>
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

      <AnimatePresence>
        {/* Email Selection View */}
        {activeView === 'email-select' && (
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
                <h3 className="font-semibold">Select Email</h3>
                <button onClick={resetState} className="p-1 hover:bg-red-600 rounded">
                  <X className="h-5 w-5"/>
                </button>
              </div>
              <div className="p-4 space-y-3">
                {contactEmails.map((email) => (
                  <button
                    key={email}
                    onClick={() => handleEmailSend(email)}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-3"
                  >
                    <Mail className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-gray-800">{email}</span>
                  </button>
                ))}
              </div>
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
      </AnimatePresence>
    </div>
  );
}