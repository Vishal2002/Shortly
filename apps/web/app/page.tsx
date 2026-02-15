// apps/web/app/page.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Zap, 
  Video, 
  TrendingUp, 
  CheckCircle2,
  ArrowRight,
  Play,
  Download,
  Share2,
  Wand2
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Shortly
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Powered Video Shorts
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">
            Turn Long Videos Into
            <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Viral Shorts
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Automatically extract the best moments from your YouTube videos and generate 
            TikTok-ready shorts with <span className="font-semibold text-foreground">AI-powered captions</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" asChild className="text-lg h-12 px-8">
              <Link href="/register">
                <Zap className="mr-2 h-5 w-5" />
                Start Creating Free
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg h-12 px-8">
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="pt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              3 free videos
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Go Viral
          </h2>
          <p className="text-xl text-muted-foreground">
            AI-powered tools to create professional shorts in minutes
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Feature 1 */}
          <Card className="border-2 hover:shadow-lg transition-all">
            <CardContent className="p-6 space-y-4">
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Wand2 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold">AI Viral Detection</h3>
              <p className="text-muted-foreground">
                Our AI analyzes your video and automatically finds the most engaging moments that will perform best on social media.
              </p>
            </CardContent>
          </Card>

          {/* Feature 2 */}
          <Card className="border-2 hover:shadow-lg transition-all">
            <CardContent className="p-6 space-y-4">
              <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold">Hormozi-Style Captions</h3>
              <p className="text-muted-foreground">
                Get professional, attention-grabbing captions with emojis that drive engagement and watch time.
              </p>
            </CardContent>
          </Card>

          {/* Feature 3 */}
          <Card className="border-2 hover:shadow-lg transition-all">
            <CardContent className="p-6 space-y-4">
              <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Video className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold">9:16 Vertical Format</h3>
              <p className="text-muted-foreground">
                Every clip is automatically formatted perfectly for TikTok, Instagram Reels, and YouTube Shorts.
              </p>
            </CardContent>
          </Card>

          {/* Feature 4 */}
          <Card className="border-2 hover:shadow-lg transition-all">
            <CardContent className="p-6 space-y-4">
              <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold">Viral Score Ranking</h3>
              <p className="text-muted-foreground">
                Each clip gets a viral potential score so you know which ones to post first for maximum impact.
              </p>
            </CardContent>
          </Card>

          {/* Feature 5 */}
          <Card className="border-2 hover:shadow-lg transition-all">
            <CardContent className="p-6 space-y-4">
              <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Download className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold">Instant Download</h3>
              <p className="text-muted-foreground">
                Download all your clips instantly with captions burned in. No editing required, ready to post.
              </p>
            </CardContent>
          </Card>

          {/* Feature 6 */}
          <Card className="border-2 hover:shadow-lg transition-all">
            <CardContent className="p-6 space-y-4">
              <div className="h-12 w-12 bg-pink-100 rounded-xl flex items-center justify-center">
                <Zap className="h-6 w-6 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Process 1-hour videos in just 2-5 minutes. Get your viral clips faster than any other tool.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            3 Simple Steps to Viral Success
          </h2>
          <p className="text-xl text-muted-foreground">
            From YouTube link to viral shorts in minutes
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center space-y-4">
            <div className="mx-auto h-16 w-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold">
              1
            </div>
            <h3 className="text-xl font-bold">Paste YouTube URL</h3>
            <p className="text-muted-foreground">
              Simply paste any YouTube video link. Works with podcasts, tutorials, vlogs, anything!
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="mx-auto h-16 w-16 bg-purple-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold">
              2
            </div>
            <h3 className="text-xl font-bold">AI Does the Magic</h3>
            <p className="text-muted-foreground">
              Our AI finds viral moments, creates clips, adds captions with emojis. All automatic.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="mx-auto h-16 w-16 bg-green-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold">
              3
            </div>
            <h3 className="text-xl font-bold">Download & Post</h3>
            <p className="text-muted-foreground">
              Download your viral-ready clips and post directly to TikTok, Reels, or Shorts. Done!
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Trusted by Content Creators
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="text-yellow-400">⭐</span>
                ))}
              </div>
              <p className="text-muted-foreground">
                "Shortly saved me 10+ hours per week. The captions are 🔥 and my engagement is up 3x!"
              </p>
              <div className="font-semibold">@contentcreator</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="text-yellow-400">⭐</span>
                ))}
              </div>
              <p className="text-muted-foreground">
                "Best investment for my YouTube channel. Turned 1 podcast into 20 viral clips instantly."
              </p>
              <div className="font-semibold">@podcasthost</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="text-yellow-400">⭐</span>
                ))}
              </div>
              <p className="text-muted-foreground">
                "The AI actually finds better moments than I would manually. Mind blowing! 🤯"
              </p>
              <div className="font-semibold">@digitalmarketer</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-0">
          <CardContent className="p-12 text-center space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Go Viral?
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Join thousands of creators using Shortly to grow their audience with AI-powered viral shorts
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" variant="secondary" asChild className="text-lg h-12 px-8">
                <Link href="/register">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start Free Trial
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg h-12 px-8 bg-transparent text-white border-white hover:bg-white/10">
                View Pricing
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-xl font-bold">Shortly</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered video shorts for content creators
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="/features" className="hover:text-foreground">Features</Link></li>
                <li><Link href="/demo" className="hover:text-foreground">Demo</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground">Terms</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground">
            © 2026 Shortly. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}