import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Upload, Video, Trash2, Eye, GripVertical, Pencil } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { B2VideoPlayer } from "@/components/media/B2VideoPlayer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MediaItem {
  id: string;
  title: string;
  description: string | null;
  file_key: string;
  file_name: string;
  file_type: string;
  file_size: number;
  is_featured: boolean;
  is_active: boolean;
  display_order: number | null;
  created_at: string;
}

type MediaCategory = "banner" | "testimonial";

function MediaSection({ category, categoryLabel }: { category: MediaCategory; categoryLabel: string }) {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);
  const [deleteMediaId, setDeleteMediaId] = useState<string | null>(null);
  const [editMedia, setEditMedia] = useState<MediaItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const { data, error } = await supabase
        .from("media_library")
        .select("*")
        .eq("file_type", "video")
        .eq("category", category)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMediaList(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...mediaList];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setMediaList(reordered);
    setDragIndex(null);
    setDragOverIndex(null);

    // Persist new order
    setSavingOrder(true);
    try {
      const updates = reordered.map((item, i) => 
        supabase.from("media_library").update({ display_order: i }).eq("id", item.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
      toast({ title: "Order saved", description: "Display order updated successfully" });
    } catch (error: any) {
      toast({ title: "Error saving order", description: error.message, variant: "destructive" });
      fetchMedia(); // revert
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        toast({ title: "Invalid file type", description: "Please select a video file", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title) {
      toast({ title: "Missing information", description: "Please select a file and enter a title", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("isFeatured", isFeatured.toString());
      formData.append("category", category);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("b2-upload-media", {
        body: formData,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Upload failed");

      toast({ title: "Success", description: `${categoryLabel} video uploaded successfully` });
      setSelectedFile(null);
      setTitle("");
      setDescription("");
      setIsFeatured(false);
      fetchMedia();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteMediaId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("b2-delete-media", {
        body: { mediaId: deleteMediaId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Delete failed");

      toast({ title: "Success", description: `${categoryLabel} video deleted successfully` });
      setDeleteMediaId(null);
      fetchMedia();
    } catch (error: any) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (mediaId: string, currentActive: boolean) => {
    const newActive = !currentActive;
    // Optimistic update
    setMediaList(prev => prev.map(m => m.id === mediaId ? { ...m, is_active: newActive } : m));
    try {
      const { error } = await supabase
        .from("media_library")
        .update({ is_active: newActive })
        .eq("id", mediaId);

      if (error) {
        // Revert on error
        setMediaList(prev => prev.map(m => m.id === mediaId ? { ...m, is_active: currentActive } : m));
        throw error;
      }
      toast({ title: "Success", description: newActive ? "Video visible on homepage" : "Video hidden from homepage" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditSave = async () => {
    if (!editMedia || !editTitle.trim()) return;
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from("media_library")
        .update({ title: editTitle.trim(), description: editDescription.trim() || null })
        .eq("id", editMedia.id);
      if (error) throw error;
      toast({ title: "Success", description: "Updated successfully" });
      setEditMedia(null);
      fetchMedia();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader /></div>;
  }

  const isTestimonial = category === "testimonial";

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload New {categoryLabel} Video</CardTitle>
          <CardDescription>
            {isTestimonial
              ? 'Videos uploaded here will appear in the "What Our Customers Say" section on the homepage'
              : "Videos uploaded here will appear in the homepage hero banner carousel"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor={`video-file-${category}`}>
              Video File {isTestimonial ? "(Portrait 3:4 ratio recommended)" : "(Portrait 4:5 ratio recommended)"}
            </Label>
            <Input id={`video-file-${category}`} type="file" accept="video/*" onChange={handleFileSelect} disabled={uploading} />
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div>
            <Label htmlFor={`title-${category}`}>{isTestimonial ? "Customer Name" : "Title"}</Label>
            <Input
              id={`title-${category}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isTestimonial ? "e.g. Rohan Desai" : "Enter video title"}
              disabled={uploading}
            />
          </div>

          <div>
            <Label htmlFor={`description-${category}`}>{isTestimonial ? "Customer Role" : "Description (Optional)"}</Label>
            {isTestimonial ? (
              <Input
                id={`description-${category}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Verified User"
                disabled={uploading}
              />
            ) : (
              <Textarea
                id={`description-${category}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter video description"
                disabled={uploading}
              />
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch id={`featured-${category}`} checked={isFeatured} onCheckedChange={setIsFeatured} disabled={uploading} />
            <Label htmlFor={`featured-${category}`}>Set as Featured</Label>
          </div>

          <Button onClick={handleUpload} disabled={uploading || !selectedFile || !title}>
            {uploading ? (
              <><Loader /><span className="ml-2">Uploading...</span></>
            ) : (
              <><Upload className="mr-2 h-4 w-4" />Upload {categoryLabel} Video</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Media List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Uploaded {categoryLabel} Videos</span>
            {savingOrder && <span className="text-xs text-muted-foreground font-normal flex items-center gap-1"><Loader /> Saving order…</span>}
          </CardTitle>
          <CardDescription>{mediaList.length} {categoryLabel.toLowerCase()} videos — drag to reorder</CardDescription>
        </CardHeader>
        <CardContent>
          {mediaList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No {categoryLabel.toLowerCase()} videos uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mediaList.map((media, index) => (
                <Card
                  key={media.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all cursor-grab active:cursor-grabbing ${
                    !media.is_active ? "opacity-60" : ""
                  } ${dragOverIndex === index ? "ring-2 ring-primary scale-[1.02]" : ""} ${
                    dragIndex === index ? "opacity-40" : ""
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-medium">#{index + 1}</span>
                    </div>
                    <div className="aspect-[4/5] bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      <B2VideoPlayer fileKey={media.file_key} muted autoPlay loop controls={false} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-semibold truncate">{media.title}</h3>
                      {media.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{media.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {(media.file_size / 1024 / 1024).toFixed(2)} MB
                        {!media.is_active && " • Hidden"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setPreviewMedia(media)}>
                        <Eye className="h-4 w-4 mr-1" />Preview
                      </Button>
                      <Button
                        size="sm"
                        variant={media.is_active ? "default" : "outline"}
                        onClick={() => handleToggleActive(media.id, media.is_active)}
                      >
                        {media.is_active ? "Active" : "Hidden"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditMedia(media); setEditTitle(media.title); setEditDescription(media.description || ""); }}
                      >
                        <Pencil className="h-4 w-4 mr-1" />Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteMediaId(media.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{previewMedia?.title}</DialogTitle>
            <DialogDescription>{previewMedia?.description}</DialogDescription>
          </DialogHeader>
          {previewMedia && (
            <div className="aspect-[4/5] rounded-xl overflow-hidden">
              <B2VideoPlayer fileKey={previewMedia.file_key} controls className="w-full h-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editMedia} onOpenChange={() => setEditMedia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {isTestimonial ? "Customer Details" : "Video Details"}</DialogTitle>
            <DialogDescription>Update details. Changes will reflect on the homepage.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">{isTestimonial ? "Customer Name" : "Title"}</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={isTestimonial ? "e.g. Rohan Desai" : "Enter video title"}
              />
            </div>
            <div>
              <Label htmlFor="edit-desc">{isTestimonial ? "Customer Role" : "Description"}</Label>
              <Input
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={isTestimonial ? "e.g. Verified User" : "Enter description"}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditMedia(null)}>Cancel</Button>
              <Button onClick={handleEditSave} disabled={editSaving || !editTitle.trim()}>
                {editSaving ? <><Loader /><span className="ml-2">Saving...</span></> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteMediaId} onOpenChange={() => setDeleteMediaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {categoryLabel.toLowerCase()} video from storage and remove it from the homepage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminBannerMediaLibrary() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-3xl font-bold">Homepage Video Manager</h1>
        <p className="text-muted-foreground">Manage all homepage videos — hero banners and customer testimonials</p>
      </div>

      <Tabs defaultValue="banner" className="w-full">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="banner">Hero Banner Videos</TabsTrigger>
          <TabsTrigger value="testimonial">Customer Testimonials</TabsTrigger>
        </TabsList>

        <TabsContent value="banner">
          <MediaSection category="banner" categoryLabel="Hero Banner" />
        </TabsContent>

        <TabsContent value="testimonial">
          <MediaSection category="testimonial" categoryLabel="Customer Testimonial" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
