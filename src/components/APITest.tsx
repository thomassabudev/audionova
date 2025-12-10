import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

const APITest: React.FC = () => {
  const { user, loading, googleSignIn, logout, emailSignIn } = useAuth();
  const [testResult, setTestResult] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  const runAuthTest = async () => {
    setIsTesting(true);
    setTestResult('Testing authentication...');
    
    try {
      // Test if user is authenticated
      if (user) {
        setTestResult(`Authenticated as: ${user.email}`);
      } else {
        setTestResult('User is not authenticated');
      }
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading authentication status...</div>;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Authentication Test</CardTitle>
        <CardDescription>Test the Firebase authentication implementation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Current User Status:</h3>
          {user ? (
            <div className="space-y-2">
              <p>Email: {user.email}</p>
              <p>Display Name: {user.displayName || 'Not set'}</p>
              <p>UID: {user.uid}</p>
            </div>
          ) : (
            <p>Not authenticated</p>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={runAuthTest} disabled={isTesting}>
            {isTesting ? 'Testing...' : 'Test Auth Status'}
          </Button>
          
          {!user ? (
            <>
              <Button onClick={googleSignIn} variant="outline">
                Sign In with Google
              </Button>
              <Button onClick={() => emailSignIn('test@example.com', 'password')} variant="outline">
                Sign In with Email (Test)
              </Button>
            </>
          ) : (
            <Button onClick={logout} variant="outline">
              Logout
            </Button>
          )}
        </div>
        
        {testResult && (
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Test Result:</h3>
            <p>{testResult}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default APITest;