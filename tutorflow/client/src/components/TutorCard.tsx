
import { Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface TutorCardProps {
  tutor: {
    id: string;
    name: string;
    avatarUrl: string | null;
    subjects: string[];
    hourlyRate: number;
    averageRating: number;
    reviewCount: number;
  };
}

import { useNavigate } from 'react-router-dom';

export const TutorCard = ({ tutor }: TutorCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="group h-full flex flex-col border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 rounded-3xl overflow-hidden bg-white">
      <div className="relative h-32 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
      
      <div className="px-6 -mt-12 flex-1 flex flex-col">
        <div className="relative mb-4 inline-block">
          <Avatar className="h-24 w-24 border-4 border-white shadow-sm">
            <AvatarImage src={tutor.avatarUrl || undefined} alt={tutor.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
              {tutor.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="font-bold text-xl tracking-tight group-hover:text-primary transition-colors">{tutor.name}</h3>
          <div className="flex items-center text-sm">
            <div className="flex items-center px-2 py-1 bg-yellow-400/10 text-yellow-700 rounded-lg font-bold">
              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500 mr-1" />
              {tutor.averageRating.toFixed(1)}
            </div>
            <span className="text-muted-foreground ml-2 font-medium">({tutor.reviewCount} reviews)</span>
          </div>
        </div>
        
        <div className="mt-6 flex flex-wrap gap-2">
          {tutor.subjects.slice(0, 2).map((subject) => (
            <Badge key={subject} variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10 border-none px-3 py-1 rounded-full text-xs font-bold">
              {subject}
            </Badge>
          ))}
          {tutor.subjects.length > 2 && (
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium border-muted/30">
              +{tutor.subjects.length - 2} more
            </Badge>
          )}
        </div>
      </div>

      <CardFooter className="px-6 py-6 flex items-center justify-between mt-auto">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Rate</span>
          <div className="font-black text-2xl text-foreground">
            ${tutor.hourlyRate}<span className="text-sm font-bold text-muted-foreground">/hr</span>
          </div>
        </div>
        <Button 
          className="rounded-2xl px-6 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5" 
          onClick={() => navigate(`/tutors/${tutor.id}`)}
        >
          Profile
        </Button>
      </CardFooter>
    </Card>
  );
};
