import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-auto bg-muted/30 border-t border-border/30">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-xl font-black tracking-tight text-gradient">TutorFlow</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Connecting students with expert tutors for personalized, 
              one-on-one learning experiences that inspire growth.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Platform</h4>
            <nav className="flex flex-col gap-2.5">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 w-fit">Find Tutors</Link>
              <Link href="/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 w-fit">Become a Tutor</Link>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 w-fit">Sign In</Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Legal</h4>
            <nav className="flex flex-col gap-2.5">
              <span className="text-sm text-muted-foreground/50 cursor-default">Privacy Policy</span>
              <span className="text-sm text-muted-foreground/50 cursor-default">Terms of Service</span>
              <span className="text-sm text-muted-foreground/50 cursor-default">Cookie Policy</span>
            </nav>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-border/20 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground/50">© 2026 TutorFlow. All rights reserved.</p>
          <p className="text-xs text-muted-foreground/40">Made with care for learners everywhere.</p>
        </div>
      </div>
    </footer>
  );
}
