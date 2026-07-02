export type Category =
  | "mindset" | "clarity" | "habit" | "focus"
  | "productivity" | "strategy" | "creativity" | "learning"
  | "wellbeing" | "logic" | "psychology" | "success"
  | "stoicism" | "cognitive-bias" | "decision-making"
  | "business" | "mental-model" | "problem-solving"
  | "game-theory" | "resilience" | "risk" | "economics";

export interface ReactFlowNode {
  id: string;
  position: { x: number; y: number };
  data: { label: string; nodeSlug?: string; description?: string; content?: string[]; isCompleted?: boolean };
  type?: string;
  style?: Record<string, string>;
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface Question {
  id: string;
  moduleId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface Module {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  isPremium: boolean;
  isFavorited?: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  questions?: Question[];
  _count?: { questions: number };
  locked?: boolean;
}

export interface ModuleListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  _count?: { questions: number };
  isFavorited?: boolean;
  isDailyFree?: boolean;
  listenMin?: number;
  readMin?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  subscriptionStatus?: string;
  preferredCategories?: string[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface UserProgress {
  id: string;
  userId: string;
  moduleId: string;
  listeningProgress: number;
  readingProgress: number;
  scrollPosition: number;
  currentCharIndex: number;
  audioRate: number;
  completed: boolean;
  lastReadAt: string;
}

export interface QuizSubmitResponse {
  score: number;
  total: number;
  percentage: number;
  answers: {
    questionId: string;
    correct: boolean;
    correctAnswer: number;
    explanation: string;
  }[];
}

export interface QuizAttempt {
  id: string;
  moduleId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  status?: string;
  completedAt: string;
  answers?: { questionId: string; selectedAnswer: number }[];
  currentQuestion?: number;
}

export interface QuizStats {
  totalQuizzesTaken: number;
  averagePercentage: number;
  totalCorrect: number;
  totalAnswered: number;
  quizXp: number;
}

export interface FavoriteItem {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  isPremium?: boolean;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  questionCount: number;
  createdAt: string;
}

export interface Reflection {
  id: string;
  userId: string;
  moduleId: string;
  title: string;
  content: string;
  timestamp: string;
  module?: { slug: string; title: string; category: string };
}

export interface MatrixRow {
  id: number;
  type: string;
  label: string;
  value: any;
  options?: string[];
}

export interface ActionPlan {
  id: string;
  userId: string;
  moduleId: string;
  title: string;
  content: MatrixRow[];
  appliedAt: string;
  completed: boolean;
  module?: { slug: string; title: string; category: string };
}

export interface ActivityItem {
  slug: string;
  title: string;
  category: string;
  listened: number;
  read: number;
  lastReadAt: string;
}

export interface RecommendedItem {
  slug: string;
  title: string;
  category: string;
}

export interface CategoryEntry {
  name: string;
  value: number;
}

export interface ProgressStats {
  totalModules: number;
  completedModules: number;
  overallProgress: number;
  listeningMinutes: number;
  readingMinutes: number;
  inProgressCount: number;
  reflectionCount: number;
  notebookCount: number;
  historyCount: number;
  categoryBreakdown: Record<string, number>;
  completedCategoryBreakdown: CategoryEntry[];
  recentActivity: ActivityItem[];
  recommendedModules: RecommendedItem[];
  listenXp: number;
  readXp: number;
  completedXp: number;
  reflectionXp: number;
  notebookXp: number;
  streakXp: number;
  totalXp: number;
  rank: string;
  rankLevel: number;
  nextRank: string | null;
  nextLevelXp: number;
  prevLevelXp: number;
  weeklyReflectionDates: string[];
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface NotebookEntry {
  id: string;
  userId: string;
  moduleId: string;
  nodeId: string;
  nodeLabel: string;
  slideIndex: number;
  slideContent: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  module: { slug: string; title: string; category: string };
}

export interface CategoryWithCount {
  name: string;
  count: number;
}
