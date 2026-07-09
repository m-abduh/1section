import { Sparkles, Zap, Brain, Target, BookOpen, Lightbulb, Heart, Hash, Trophy, Eye, Feather, BarChart, type LucideIcon } from "lucide-react";

export const ALL_CATEGORIES = [
  "mindset", "clarity", "habit", "focus", "productivity",
  "strategy", "creativity", "learning", "wellbeing", "logic",
  "psychology", "success", "stoicism", "cognitive-bias",
  "decision-making", "business", "mental-model", "problem-solving",
  "game-theory", "resilience", "risk", "economics",
] as const;

export type Category = typeof ALL_CATEGORIES[number];

export const categoryMeta: Record<string, { icon: LucideIcon; desc: string }> = {
  mindset:        { icon: Brain,      desc: "Mental models & core beliefs" },
  clarity:        { icon: Eye,        desc: "Gain clarity & reduce noise" },
  focus:          { icon: Target,     desc: "Sharpen your focus" },
  habit:          { icon: Zap,        desc: "Build better habits" },
  productivity:   { icon: BarChart,   desc: "Do more with less" },
  strategy:       { icon: Lightbulb,  desc: "Think strategically" },
  creativity:     { icon: Feather,    desc: "Unlock your creativity" },
  learning:       { icon: BookOpen,   desc: "Learn how to learn" },
  wellbeing:      { icon: Heart,      desc: "Mind & body wellness" },
  logic:          { icon: Hash,       desc: "Reason with structure" },
  psychology:     { icon: Brain,      desc: "Understand the mind" },
  success:        { icon: Trophy,     desc: "Pathways to success" },
  stoicism:       { icon: Feather,    desc: "Ancient wisdom" },
  "cognitive-bias":    { icon: Brain,      desc: "Recognize bias" },
  "decision-making":   { icon: Target,     desc: "Make better decisions" },
  business:       { icon: BarChart,   desc: "Business & entrepreneurship" },
  "mental-model": { icon: Brain,      desc: "Mental models" },
  "problem-solving":   { icon: Lightbulb,  desc: "Solve complex problems" },
  "game-theory":  { icon: Hash,       desc: "Strategic interaction" },
  resilience:     { icon: Heart,      desc: "Bounce back stronger" },
  risk:           { icon: BarChart,   desc: "Understand & manage risk" },
  economics:      { icon: BarChart,   desc: "Economic principles" },
};
