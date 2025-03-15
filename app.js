const { useState, useEffect, useRef, useCallback } = React;
const { createRoot } = ReactDOM;

// Initialize WebsimSocket for realtime chat
const room = new WebsimSocket();

const NoiseChat = () => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [noiseGrid, setNoiseGrid] = useState([]);
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

  // Generate random noise pixels as a grid covering the entire screen
  const generateNoiseGrid = useCallback(() => {
    const now = Date.now();
    // Limit updates to 24 fps
    if (now - lastUpdateTimeRef.current < 42) {
      animationFrameRef.current = requestAnimationFrame(generateNoiseGrid);
      return;
    }
    
    lastUpdateTimeRef.current = now;
    
    const pixelSize = 3; // Size of each noise pixel
    const columns = Math.ceil(window.innerWidth / pixelSize);
    const rows = Math.ceil(window.innerHeight / pixelSize);
    
    const newGrid = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        // Randomly assign black or white
        newGrid.push({
          id: `${x}-${y}`,
          x: x * pixelSize,
          y: y * pixelSize,
          size: pixelSize,
          isWhite: Math.random() > 0.5
        });
      }
    }
    
    setNoiseGrid(newGrid);
    animationFrameRef.current = requestAnimationFrame(generateNoiseGrid);
  }, []);

  // Start and clean up animation frame
  useEffect(() => {
    generateNoiseGrid();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [generateNoiseGrid]);

  // Send message handler
  const sendMessage = async () => {
    if (messageInput.trim() === '') return;
    
    await room.collection('message').create({
      text: messageInput
    });
    
    setMessageInput('');
  };

  // Message with continuously jittering characters
  const JitteringMessage = ({ text }) => {
    const [jitterStates, setJitterStates] = useState([]);
    
    useEffect(() => {
      const intervalId = setInterval(() => {
        setJitterStates(
          Array(text.length).fill().map(() => ({
            offsetX: (Math.random() - 0.5) * 3,
            offsetY: (Math.random() - 0.5) * 3,
            rotation: (Math.random() - 0.5) * 10, // Add rotation for more movement
            scale: 0.9 + Math.random() * 0.2, // Add slight scaling
            color: Math.random() > 0.5 ? '#ffffff' : '#f0f0f0' // Slight color variation for better visibility
          }))
        );
      }, 30); // Faster update rate to make text constantly moving
      
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
                `translate(${jitterStates[index].offsetX}px, ${jitterStates[index].offsetY}px) 
                 rotate(${jitterStates[index].rotation}deg)
                 scale(${jitterStates[index].scale})` : 'none',
              color: jitterStates[index]?.color || 'white',
              textShadow: '0 0 2px rgba(255,255,255,0.8)'
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
        {noiseGrid.map((pixel) => (
          <div
            key={pixel.id}
            className={`noise-pixel ${pixel.isWhite ? 'white' : 'black'}`}
            style={{
              width: `${pixel.size}px`,
              height: `${pixel.size}px`,
              left: `${pixel.x}px`,
              top: `${pixel.y}px`
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