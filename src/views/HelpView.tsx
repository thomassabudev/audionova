import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  HelpCircle, 
  MessageCircle, 
  Mail, 
  FileText, 
  Users, 
  Shield,
  Bug
} from 'lucide-react';

const HelpView = () => {
  const helpTopics = [
    {
      id: 1,
      title: "Getting Started",
      description: "Learn the basics of using our music player",
      icon: HelpCircle,
    },
    {
      id: 2,
      title: "Account & Billing",
      description: "Manage your account and subscription",
      icon: Users,
    },
    {
      id: 3,
      title: "Playback Issues",
      description: "Troubleshoot audio and playback problems",
      icon: MessageCircle,
    },
    {
      id: 4,
      title: "Privacy & Security",
      description: "Understand our privacy practices",
      icon: Shield,
    },
    {
      id: 5,
      title: "Technical Support",
      description: "Get help with technical issues",
      icon: Bug,
    },
    {
      id: 6,
      title: "FAQ",
      description: "Frequently asked questions",
      icon: FileText,
    },
  ];

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Help & Support</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions or get in touch with our support team
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {helpTopics.map((topic) => {
            const Icon = topic.icon;
            return (
              <Card key={topic.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-red-500" />
                  </div>
                  <CardTitle>{topic.title}</CardTitle>
                  <CardDescription>{topic.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    View Articles
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
            <CardDescription>
              Can't find what you're looking for? Our support team is here to help.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="What do you need help with?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="your.email@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Please describe your issue in detail..."
                ></textarea>
              </div>
              <div className="flex justify-end">
                <Button type="submit">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Response time: Within 24 hours</p>
        </div>
      </div>
    </div>
  );
};

export default HelpView;