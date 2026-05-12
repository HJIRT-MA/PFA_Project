
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
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <Avatar className="h-14 w-14 border">
          <AvatarImage src={tutor.avatarUrl || undefined} alt={tutor.name} />
          <AvatarFallback>{tutor.name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <h3 className="font-semibold text-lg">{tutor.name}</h3>
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
            <span className="font-medium text-foreground mr-1">{tutor.averageRating.toFixed(1)}</span>
            <span>({tutor.reviewCount} reviews)</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pb-4">
        <div className="flex flex-wrap gap-2 mt-2">
          {tutor.subjects.slice(0, 3).map((subject) => (
            <Badge key={subject} variant="secondary">{subject}</Badge>
          ))}
          {tutor.subjects.length > 3 && (
            <Badge variant="outline">+{tutor.subjects.length - 3}</Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t pt-4">
        <div className="font-semibold text-lg">
          ${tutor.hourlyRate}<span className="text-sm font-normal text-muted-foreground">/h</span>
        </div>
        <Button variant="default" size="sm" onClick={() => navigate(`/tutors/${tutor.id}`)}>
          View profile
        </Button>
      </CardFooter>
    </Card>
  );
};
