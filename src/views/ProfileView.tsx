import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload } from 'lucide-react';

const ProfileView: React.FC = () => {
  const { user, logout, updateProfilePicture } = useAuth();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Function to handle file selection
  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Function to handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      // In a real application, you would upload the file to a storage service like Firebase Storage
      // For now, we'll create a local URL for demonstration and also store in localStorage
      const imageUrl = URL.createObjectURL(file);
      
      // Store the image in localStorage as well for persistence
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageData = event.target?.result as string;
        if (imageData) {
          localStorage.setItem(`userProfileImage_${user?.uid}`, imageData);
          // Update the profile picture in Firebase Auth
          await updateProfilePicture(imageUrl);
        }
      };
      reader.readAsDataURL(file);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to update profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  // Load profile image from localStorage on component mount
  React.useEffect(() => {
    const loadImageFromStorage = () => {
      if (user?.uid) {
        const storedImage = localStorage.getItem(`userProfileImage_${user.uid}`);
        if (storedImage) {
          // Create a blob URL from the stored data
          const imageUrl = URL.createObjectURL(dataURItoBlob(storedImage));
          // Update the profile picture in Firebase Auth
          updateProfilePicture(imageUrl);
        }
      }
    };
    
    loadImageFromStorage();
  }, [user?.uid]);

  // Helper function to convert data URI to Blob
  const dataURItoBlob = (dataURI: string) => {
    let byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0) {
      byteString = atob(dataURI.split(',')[1]);
    } else {
      byteString = unescape(dataURI.split(',')[1]);
    }
    
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ia], { type: mimeString });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  className="w-24 h-24 rounded-full object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-2xl font-medium text-white">
                    {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              {/* Add camera icon for changing profile picture */}
              <button
                onClick={handleFileSelect}
                className="absolute bottom-0 right-0 bg-primary rounded-full p-2 shadow-md hover:bg-primary/90 transition-colors"
                aria-label="Change profile picture"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            
            {/* Hidden file input with proper accessibility attributes */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
              aria-label="Upload profile picture"
            />
            
            {/* Upload button for better accessibility */}
            <Button 
              onClick={handleFileSelect} 
              variant="outline" 
              size="sm"
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Change Picture'}
            </Button>
            
            {uploadError && (
              <p className="text-sm text-red-500">{uploadError}</p>
            )}
            
            <div className="text-center">
              <h2 className="text-xl font-semibold">
                {user?.displayName || 'User'}
              </h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <p className="text-sm text-muted-foreground mt-1">
                User ID: {user?.uid}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Display Name</label>
                <p className="font-medium">{user?.displayName || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Provider</label>
              <p className="font-medium">
                {user?.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Email/Password'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Created</label>
              <p className="font-medium">
                {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileView;