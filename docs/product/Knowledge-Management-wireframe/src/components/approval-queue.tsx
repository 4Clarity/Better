import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Textarea } from "./ui/textarea";
import {
  CheckSquare,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Avatar, AvatarFallback } from "./ui/avatar";

interface ApprovalItem {
  id: string;
  factContent: string;
  confidenceScore: number;
  source: string;
  category: string;
  tags: string[];
  submittedDate: string;
  submittedBy: string;
  priority: "low" | "medium" | "high";
  reviewNotes?: string;
  estimatedReviewTime: number; // in minutes
}

export function ApprovalQueue() {
  const [approvalItems, setApprovalItems] = useState<
    ApprovalItem[]
  >([
    {
      id: "1",
      factContent:
        "The product requires enhanced security features including multi-factor authentication and encryption.",
      confidenceScore: 95,
      source: "Client Requirements Discussion",
      category: "Security",
      tags: ["authentication", "encryption", "security"],
      submittedDate: "2024-01-16T14:30:00",
      submittedBy: "AI System",
      priority: "high",
      estimatedReviewTime: 5,
    },
    {
      id: "2",
      factContent:
        "API rate limiting should be implemented with a default of 1000 requests per hour.",
      confidenceScore: 82,
      source: "Technical_Manual.docx",
      category: "API",
      tags: ["api", "rate-limiting", "performance"],
      submittedDate: "2024-01-16T13:15:00",
      submittedBy: "Document Parser",
      priority: "medium",
      estimatedReviewTime: 3,
    },
    {
      id: "3",
      factContent:
        "Users prefer dark mode interface for better usability during night hours.",
      confidenceScore: 78,
      source: "User Feedback Analysis",
      category: "UI/UX",
      tags: ["ui", "dark-mode", "user-preference"],
      submittedDate: "2024-01-16T12:00:00",
      submittedBy: "Feedback Analyzer",
      priority: "low",
      estimatedReviewTime: 2,
    },
    {
      id: "4",
      factContent:
        "Database backup frequency should be increased to daily instead of weekly.",
      confidenceScore: 91,
      source: "Infrastructure Review Meeting",
      category: "Infrastructure",
      tags: ["database", "backup", "reliability"],
      submittedDate: "2024-01-16T11:45:00",
      submittedBy: "Meeting Analyzer",
      priority: "high",
      estimatedReviewTime: 7,
    },
  ]);

  const [reviewingItem, setReviewingItem] =
    useState<ApprovalItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewDialogOpen, setIsReviewDialogOpen] =
    useState(false);

  const handleApprove = (item: ApprovalItem) => {
    setApprovalItems((prev) =>
      prev.filter((i) => i.id !== item.id),
    );
    setIsReviewDialogOpen(false);
    setReviewingItem(null);
    setReviewNotes("");
  };

  const handleReject = (item: ApprovalItem) => {
    setApprovalItems((prev) =>
      prev.filter((i) => i.id !== item.id),
    );
    setIsReviewDialogOpen(false);
    setReviewingItem(null);
    setReviewNotes("");
  };

  const startReview = (item: ApprovalItem) => {
    setReviewingItem(item);
    setReviewNotes("");
    setIsReviewDialogOpen(true);
  };

  const getPriorityBadge = (
    priority: ApprovalItem["priority"],
  ) => {
    switch (priority) {
      case "high":
        return (
          <Badge variant="destructive">High Priority</Badge>
        );
      case "medium":
        return (
          <Badge
            variant="outline"
            className="border-orange-300 text-orange-600"
          >
            Medium Priority
          </Badge>
        );
      case "low":
        return <Badge variant="secondary">Low Priority</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const sortedItems = [...approvalItems].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (
      priorityOrder[a.priority] !== priorityOrder[b.priority]
    ) {
      return (
        priorityOrder[b.priority] - priorityOrder[a.priority]
      );
    }
    return (
      new Date(a.submittedDate).getTime() -
      new Date(b.submittedDate).getTime()
    );
  });

  const totalEstimatedTime = approvalItems.reduce(
    (acc, item) => acc + item.estimatedReviewTime,
    0,
  );

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">
            Approval Queue
          </h2>
          <p className="text-muted-foreground">
            Review and approve extracted facts before they
            become part of the knowledge base.
          </p>
        </div>

        {/* Queue Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">
                    Pending Review
                  </p>
                  <p className="text-2xl font-bold">
                    {approvalItems.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">
                    High Priority
                  </p>
                  <p className="text-2xl font-bold">
                    {
                      approvalItems.filter(
                        (i) => i.priority === "high",
                      ).length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">
                    Est. Review Time
                  </p>
                  <p className="text-2xl font-bold">
                    {totalEstimatedTime}min
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approval Queue Items */}
        <div className="space-y-4">
          {sortedItems.map((item) => (
            <Card
              key={item.id}
              className="border-l-4 border-l-primary/20"
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        {getPriorityBadge(item.priority)}
                        <Badge variant="outline">
                          {item.category}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={getConfidenceColor(
                            item.confidenceScore,
                          )}
                        >
                          {item.confidenceScore}% confidence
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{item.submittedBy}</span>
                        </div>
                        <span>•</span>
                        <span>
                          {formatTimeAgo(item.submittedDate)}
                        </span>
                        <span>•</span>
                        <span>
                          ~{item.estimatedReviewTime}min review
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Extracted Fact:
                      </p>
                      <p className="leading-relaxed bg-muted/50 p-3 rounded-md">
                        {item.factContent}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">
                        Source:
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.source}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        Tags:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Confidence Score</span>
                        <span>{item.confidenceScore}%</span>
                      </div>
                      <Progress
                        value={item.confidenceScore}
                        className="h-2"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startReview(item)}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Review
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(item)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Quick Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(item)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Quick Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {approvalItems.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No items in the approval queue.
                </p>
                <p className="text-sm text-muted-foreground">
                  All facts have been reviewed and processed.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Review Dialog */}
        <Dialog
          open={isReviewDialogOpen}
          onOpenChange={setIsReviewDialogOpen}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Review Fact for Approval
              </DialogTitle>
              <DialogDescription>
                Carefully review the extracted fact and provide
                feedback before making a decision.
              </DialogDescription>
            </DialogHeader>
            {reviewingItem && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {getPriorityBadge(reviewingItem.priority)}
                    <Badge variant="outline">
                      {reviewingItem.category}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={getConfidenceColor(
                        reviewingItem.confidenceScore,
                      )}
                    >
                      {reviewingItem.confidenceScore}%
                      confidence
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Fact Content:
                    </p>
                    <p className="leading-relaxed bg-muted/50 p-3 rounded-md">
                      {reviewingItem.factContent}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">
                      Source:
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {reviewingItem.source}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">
                      Tags:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {reviewingItem.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Review Notes (Optional)
                  </label>
                  <Textarea
                    placeholder="Add any notes about this fact review..."
                    value={reviewNotes}
                    onChange={(e) =>
                      setReviewNotes(e.target.value)
                    }
                    className="min-h-20"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsReviewDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReject(reviewingItem)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleApprove(reviewingItem)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}