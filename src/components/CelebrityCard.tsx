import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Video, Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface CelebrityCardProps {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  rating: number | null;
  review_count: number | null;
  service_prices: any;
  delivery_time: string | null;
  followers: string | null;
}

const CelebrityCard = ({ 
  id, 
  name, 
  category, 
  image_url, 
  rating, 
  review_count,
  service_prices,
  delivery_time,
  followers 
}: CelebrityCardProps) => {
  const prices = service_prices as { video_wish?: number } | null;
  const price = prices?.video_wish || 999;

  return (
    <Link to={`/celebrity/${id}`}>
      <Card className="group overflow-hidden border border-border/50 bg-card hover:shadow-card transition-all duration-300 hover:scale-[1.02] cursor-pointer">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          {image_url ? (
            <img 
              src={image_url} 
              alt={name}
              className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-card flex items-center justify-center">
              <Star className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {delivery_time && (
            <Badge className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm border-border/50">
              <Clock className="h-3 w-3 mr-1" />
              {delivery_time}
            </Badge>
          )}
        </div>

        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{name}</h3>
              <p className="text-sm text-muted-foreground">{category}</p>
            </div>
          </div>

          {followers && (
            <p className="text-xs text-muted-foreground">{followers} followers</p>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-1">
              {rating && (
                <>
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="text-sm font-medium">{rating.toFixed(1)}</span>
                  {review_count && (
                    <span className="text-xs text-muted-foreground">({review_count})</span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-lg bg-gradient-primary bg-clip-text text-transparent">
                ₹{price}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default CelebrityCard;
