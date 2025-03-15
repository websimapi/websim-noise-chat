const { useState, useEffect, useRef, useCallback } = React;
const { createRoot } = ReactDOM;

// Initialize WebsimSocket for realtime chat
const room = new WebsimSocket();

const NoiseChat = () => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [noisePixels, setNoisePixels] = useState([]);
  const messageEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(Date.now());

  // Get messages from collection
  const chatMessages = React.useSyncExternalStore(
    room.collection('message').subscribe,
    room.collection('message').getList
  );

  useEffect(() => {
    // Sort messages by created_at
    const sortedMessages = [...chatMessages].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    setMessages(sortedMessages);
  }, [chatMessages]);

  // Message handling
  useEffect(() => {
    room.onmessage = (event) => {
      const data = event.data;
      if (data.type === "connected") {
        console.log(`Client ${data.clientId}, ${data.username} connected`);
      } else if (data.type === "disconnected") {
        console.log(`Client ${data.clientId}, ${data.username} disconnected`);
      }
    };
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate random noise pixels
  const generateNoisePixels = useCallback(() => {
    const now = Date.now();
    // Limit updates to 20 fps
    if (now - lastUpdateTimeRef.current < 50) {
      animationFrameRef.current = requestAnimationFrame(generateNoisePixels);
      return;
    }
    
    lastUpdateTimeRef.current = now;
    
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const pixelDensity = Math.floor(containerWidth * containerHeight / 10000);
    
    const newPixels = [];
    for (let i = 0; i < pixelDensity; i++) {
      newPixels.push({
        id: i,
        size: Math.random() * 3 + 1,
        x: Math.random() * containerWidth,
        y: Math.random() * containerHeight,
        opacity: Math.random() * 0.5 + 0.1
      });
    }
    
    setNoisePixels(newPixels);
    animationFrameRef.current = requestAnimationFrame(generateNoisePixels);
  }, []);

  // Start and clean up animation frame
  useEffect(() => {
    generateNoisePixels();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [generateNoisePixels]);

  // Send message handler
  const sendMessage = async () => {
    if (messageInput.trim() === '') return;
    
    await room.collection('message').create({
      text: messageInput
    });
    
    setMessageInput('');
  };

  // Message with jittering characters
  const JitteringMessage = ({ text }) => {
    const [jitterStates, setJitterStates] = useState([]);
    
    useEffect(() => {
      const intervalId = setInterval(() => {
        setJitterStates(
          Array(text.length).fill().map(() => ({
            offsetX: (Math.random() - 0.5) * 2,
            offsetY: (Math.random() - 0.5) * 2,
            opacity: Math.random() * 0.7 + 0.3
          }))
        );
      }, 50);
      
      return () => clearInterval(intervalId);
    }, [text]);
    
    return (
      <span className="message-text">
        {text.split('').map((char, index) => (
          <span 
            key={index} 
            className="message-text-char"
            style={{
              transform: jitterStates[index] ? 
                `translate(${jitterStates[index].offsetX}px, ${jitterStates[index].offsetY}px)` : 'none',
              opacity: jitterStates[index] ? jitterStates[index].opacity : 1
            }}
          >
            {char}
          </span>
        ))}
      </span>
    );
  };

  return (
    <div className="noise-container">
      <div className="noise-layer">
        {noisePixels.map((pixel) => (
          <div
            key={pixel.id}
            className="noise-pixel"
            style={{
              width: `${pixel.size}px`,
              height: `${pixel.size}px`,
              left: `${pixel.x}px`,
              top: `${pixel.y}px`,
              opacity: pixel.opacity
            }}
          />
        ))}
      </div>
      
      <div className="chat-container" ref={chatContainerRef}>
        <div className="chat-messages">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${
                message.username === room.party.client.username 
                  ? 'my-message' 
                  : 'other-message'
              }`}
            >
              <div className="username">{message.username}</div>
              <JitteringMessage text={message.text} />
            </div>
          ))}
          <div ref={messageEndRef} />
        </div>
        
        <div className="input-area">
          <input
            type="text"
            className="message-input"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
          />
          <button className="send-button" onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return <NoiseChat />;
};

const root = createRoot(document.getElementById('app'));
root.render(<App />);

