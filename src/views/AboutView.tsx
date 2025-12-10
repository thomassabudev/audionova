import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Info,
  FileText,
  Shield,
  Cookie,
  Users,
  Heart,
  Twitter,
  Instagram,
  Youtube,
  MessageCircle,
  Download,
  History,
  Scan
} from 'lucide-react';

const AboutView = () => {
  const appInfo = {
    name: "AudioNova Music Player",
    version: "v2.1.0",
    buildDate: "November 2023",
    buildHash: "a1b2c3d4e5f",
  };

  const legalLinks = [
    { name: "Terms of Service", icon: FileText, href: "/legal/terms" },
    { name: "Privacy Policy", icon: Shield, href: "/legal/privacy" },
    { name: "Cookie Policy", icon: Cookie, href: "/legal/cookies" },
  ];

  const socialLinks = [
    { name: "Twitter", icon: Twitter, href: "https://twitter.com/audionova" },
    { name: "Instagram", icon: Instagram, href: "https://instagram.com/audionova" },
    { name: "YouTube", icon: Youtube, href: "https://youtube.com/audionova" },
    { name: "Discord", icon: MessageCircle, href: "https://discord.gg/audionova" },
  ];

  const contributors = [
    { name: "Thomas Sabu", role: "Lead Developer" },
    { name: "Alex Johnson", role: "UI/UX Designer" },
    { name: "Maria Garcia", role: "Backend Engineer" },
    { name: "David Kim", role: "QA Specialist" },
  ];

  const openSourceLibraries = [
    { name: "React", version: "18.2.0", license: "MIT" },
    { name: "TypeScript", version: "5.0.0", license: "Apache 2.0" },
    { name: "Tailwind CSS", version: "3.3.0", license: "MIT" },
    { name: "Framer Motion", version: "10.16.0", license: "MIT" },
    { name: "Radix UI", version: "1.0.0", license: "MIT" },
    { name: "Lucide React", version: "0.292.0", license: "ISC" },
  ];

  return (
    <div className="space-y-6">
      {/* App Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            App Information
          </CardTitle>
          <CardDescription>Details about the application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-r from-red-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">AN</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">{appInfo.name}</h3>
              <p className="text-muted-foreground">Premium music streaming experience</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div>
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="font-medium">{appInfo.version}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">{appInfo.buildDate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Build Hash</p>
              <p className="font-mono text-sm font-medium">{appInfo.buildHash}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Changelog</p>
              <Button variant="link" className="p-0 h-auto font-medium">
                View Changelog
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Developer & Legal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Developer & Legal
          </CardTitle>
          <CardDescription>Legal information and policies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {legalLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Button
                  key={link.name}
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center gap-1"
                  onClick={() => window.open(link.href, '_blank')}
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.name}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contact & Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Contact & Support
          </CardTitle>
          <CardDescription>Get in touch with our team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline">
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
            <Button variant="outline">
              <Scan className="w-4 h-4 mr-2" />
              Report a Bug
            </Button>
            <Button variant="outline">
              <Heart className="w-4 h-4 mr-2" />
              Feature Request
            </Button>
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Community Feedback
            </Button>
          </div>
          
          <div className="pt-4">
            <p className="text-sm font-medium mb-3">Follow Us</p>
            <div className="flex flex-wrap gap-2">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Button
                    key={link.name}
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(link.href, '_blank')}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {link.name}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credits & Acknowledgments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Credits & Acknowledgments
          </CardTitle>
          <CardDescription>People and technologies that made this possible</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium mb-3">Core Team</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contributors.map((contributor) => (
                <div key={contributor.name} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-medium">
                      {contributor.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{contributor.name}</p>
                    <p className="text-sm text-muted-foreground">{contributor.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-3">Open Source Libraries</p>
            <div className="space-y-2">
              {openSourceLibraries.map((library) => (
                <div key={library.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{library.name}</p>
                    <p className="text-sm text-muted-foreground">v{library.version}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-background rounded">
                    {library.license}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transparency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Transparency
          </CardTitle>
          <CardDescription>Additional information about our operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline">
              <Heart className="w-4 h-4 mr-2" />
              System Status
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Data Center Info
            </Button>
            <Button variant="outline">
              <Shield className="w-4 h-4 mr-2" />
              Accessibility Statement
            </Button>
            <Button variant="outline">
              <History className="w-4 h-4 mr-2" />
              Version History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AboutView;