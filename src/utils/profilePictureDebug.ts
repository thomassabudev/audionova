/**
 * Profile Picture Debug Utilities
 * Helper functions to debug Google profile picture issues
 */

export const debugGoogleProfilePicture = (user: any) => {
  if (!user) {
    console.log('🔍 No user logged in');
    return;
  }

  console.group('🖼️ Google Profile Picture Debug');
  console.log('User UID:', user.uid);
  console.log('User Email:', user.email);
  console.log('Display Name:', user.displayName);
  console.log('Photo URL:', user.photoURL);
  console.log('Photo URL Type:', typeof user.photoURL);
  console.log('Photo URL Length:', user.photoURL?.length || 0);
  
  if (user.photoURL) {
    console.log('Is Google URL:', user.photoURL.includes('googleusercontent.com') || user.photoURL.includes('googleapis.com'));
    
    // Test if the image loads
    const img = new Image();
    img.onload = () => {
      console.log('✅ Image loads successfully');
      console.log('Image dimensions:', img.naturalWidth, 'x', img.naturalHeight);
    };
    img.onerror = (error) => {
      console.log('❌ Image failed to load:', error);
    };
    img.src = user.photoURL;
  }
  
  // Check localStorage
  const savedPicture = localStorage.getItem(`profilePicture_${user.uid}`);
  console.log('LocalStorage Picture:', savedPicture ? 'Present' : 'None');
  
  console.groupEnd();
};

// Make available globally for debugging
(window as any).debugGoogleProfilePicture = debugGoogleProfilePicture;