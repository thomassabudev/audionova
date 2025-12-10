import { useState, useEffect } from 'react';

// Custom hook for listening to new releases via SSE
const useNewReleasesStream = () => {
  const [newReleases, setNewReleases] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    let eventSource;

    const connect = () => {
      try {
        eventSource = new EventSource('/api/new-releases/events');
        
        eventSource.onopen = () => {
          console.log('SSE connection opened');
          setConnected(true);
          setError(null);
        };
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'connected') {
              console.log('Connected to new releases stream');
              return;
            }
            
            if (data.type === 'new_release') {
              setNewReleases(prev => {
                // Check if song already exists to avoid duplicates
                const exists = prev.some(song => song.id === data.song.id);
                if (!exists) {
                  return [data.song, ...prev];
                }
                return prev;
              });
            }
          } catch (err) {
            console.error('Error parsing SSE message:', err);
          }
        };
        
        eventSource.onerror = (err) => {
          console.error('SSE error:', err);
          setError('Connection error');
          setConnected(false);
          
          // Attempt to reconnect after 5 seconds
          setTimeout(() => {
            if (eventSource.readyState === EventSource.CLOSED) {
              connect();
            }
          }, 5000);
        };
      } catch (err) {
        console.error('Error creating EventSource:', err);
        setError('Failed to connect to server');
      }
    };

    connect();

    // Cleanup
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const clearNewReleases = () => {
    setNewReleases([]);
  };

  return {
    newReleases,
    connected,
    error,
    clearNewReleases
  };
};

export default useNewReleasesStream;