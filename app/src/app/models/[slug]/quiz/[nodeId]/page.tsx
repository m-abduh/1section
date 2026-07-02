"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, ArrowRight, RefreshCw, ArrowLeft, Lock } from "lucide-react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useModule, useSubmitQuiz, useSaveQuizProgress, useQuizProgress } from "@/lib/query-hooks";
import { getSlides } from "@/lib/course-content";
import type { QuizSubmitResponse } from "@/lib/types";

type Answer = { questionId: string; selectedAnswer: number };

export default function NodeQuizPage({ params }: { params: Promise<{ slug: string; nodeId: string }> }) {
  const { slug, nodeId } = use(params);
  const router = useRouter();
  const { data: module, isLoading: moduleLoading } = useModule(slug);
  const { data: savedProgress, isLoading: progressLoading } = useQuizProgress(slug);
  const submitMutation = useSubmitQuiz();
  const saveProgressMutation = useSaveQuizProgress();

  const slides = getSlides(module?.nodes || []);
  const nodeSlides = slides.filter((s) => s.nodeId === nodeId);
  const nodeLabel = nodeSlides[0]?.nodeLabel || "Unknown Node";

  const questions = module?.questions ?? [];

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<QuizSubmitResponse | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const loading = moduleLoading || progressLoading;

  const submitWithAnswers = async (submitAnswers: Answer[]) => {
    try {
      const res = await submitMutation.mutateAsync({ slug, answers: submitAnswers });
      setResult(res);
    } catch {
      const s = submitAnswers.reduce((acc, a) => {
        const isCorrect = a.selectedAnswer === (module?.questions?.find((_, i) => questions[i]?.id === a.questionId)?.correctAnswer ?? -1);
        return acc + (isCorrect ? 1 : 0);
      }, 0);
      setResult({ score: s, total: questions.length, percentage: Math.round((s / questions.length) * 100), answers: [] });
    } finally {
      setFinished(true);
      setSubmitting(false);
    }
  };

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleNext = () => {
    if (selectedAnswer === null || submitting || submittedRef.current) return;
    submittedRef.current = true;

    const question = questions[currentQuestion];
    if (!question) return;

    const isCorrect = selectedAnswer === (module?.questions?.[currentQuestion]?.correctAnswer ?? -1);
    if (isCorrect) setScore(s => s + 1);

    const newAnswer: Answer = { questionId: question.id, selectedAnswer };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    setShowResult(true);

    saveProgressMutation.mutate({ slug, answers: newAnswers, currentQuestion });
  };

  const handleContinue = () => {
    if (submitting) return;
    submittedRef.current = false;
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(c => c + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setSubmitting(true);
      submitWithAnswers(answers);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setFinished(false);
    setResult(null);
    setAnswers([]);
    setSubmitting(false);
    submittedRef.current = false;
  };

  const percentage = Math.round((score / (questions.length || 1)) * 100);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg">
        <div className="w-6 h-6 border-2 border-border border-t-fg rounded-full animate-spin" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-border border-t-fg rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (module?.locked) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg">
        <div className="text-center">
          <Lock size={32} className="mx-auto text-muted-dark mb-4" />
          <p className="text-sm text-muted">Subscribe to access this quiz.</p>
          <button
            onClick={() => router.push(`/models/${slug}`)}
            className="mt-4 px-4 py-2 text-xs font-medium rounded-lg bg-bg-elevated border border-border text-muted hover:text-fg transition-all cursor-pointer"
          >
            Back to path
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg">
        <div className="text-center">
          <p className="text-sm text-muted">No quiz questions available for this node.</p>
          <button
            onClick={() => router.push(`/models/${slug}`)}
            className="mt-4 px-4 py-2 text-xs font-medium rounded-lg bg-bg-elevated border border-border text-muted hover:text-fg transition-all cursor-pointer"
          >
            Back to path
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-bg flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push(`/models/${slug}`)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-fg hover:bg-bg-elevated transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-xs text-muted-dark">Quiz</p>
            <p className="text-sm font-semibold text-fg">{nodeLabel}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-[600px] mx-auto">
          {!finished ? (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <span className="text-xs text-muted-dark">Question {currentQuestion + 1} of {questions.length}</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h2 className="text-lg sm:text-xl font-bold text-fg mb-6 leading-snug">
                    {questions[currentQuestion]?.question}
                  </h2>

                  <div className="flex flex-col gap-2.5 mb-6">
                    {questions[currentQuestion]?.options.map((option: string, idx: number) => {
                      const isCorrectOption = module.questions?.[currentQuestion]?.correctAnswer === idx;
                      const isWrongSelected = showResult && selectedAnswer === idx && !isCorrectOption;
                      const isCorrectSelected = showResult && selectedAnswer === idx && isCorrectOption;

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelect(idx)}
                          disabled={showResult}
                          className={`w-full text-left px-5 py-3.5 rounded-xl text-sm border transition-all duration-200 ${
                            showResult
                              ? isCorrectOption
                                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                : isWrongSelected
                                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                  : 'bg-bg-card border-border-subtle text-muted'
                              : selectedAnswer === idx
                                ? 'bg-bg-elevated border-border text-fg'
                                : 'bg-bg-card border-border-subtle text-muted hover:border-border hover:text-fg'
                          } ${!showResult ? 'cursor-pointer' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{option}</span>
                            {showResult && isCorrectOption && <CheckCircle size={18} className="text-green-400 shrink-0" />}
                            {showResult && isWrongSelected && <XCircle size={18} className="text-red-400 shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

              {!showResult ? (
                <button
                  onClick={handleNext}
                  disabled={selectedAnswer === null || submitting}
                  className="w-full py-3.5 bg-fg text-bg rounded-xl font-semibold text-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? "Submitting..." : "Submit Answer"}
                </button>
              ) : (
                <div>
                  <div className="mb-4 p-4 rounded-xl bg-bg-card border border-border-subtle">
                    {module.questions?.[currentQuestion]?.explanation && (
                      <p className="text-sm text-muted leading-relaxed">
                        {module.questions[currentQuestion].explanation}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleContinue}
                    disabled={submitting}
                    className="w-full py-3.5 bg-fg text-bg rounded-xl font-semibold text-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? "Submitting..." : currentQuestion < questions.length - 1 ? (
                      <>Next Question <ArrowRight size={16} /></>
                    ) : (
                      <>See Results <ArrowRight size={16} /></>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-black">{result?.percentage ?? percentage}%</span>
              </div>
              <h2 className="text-2xl font-bold text-fg mb-1">
                {percentage >= 80 ? "Great job!" : percentage >= 50 ? "Good effort!" : "Keep practicing!"}
              </h2>
              <p className="text-sm text-muted mb-6">
                You got {result?.score ?? score} out of {result?.total ?? questions.length} correct
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleRestart}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-fg text-bg rounded-xl font-semibold text-sm cursor-pointer hover:opacity-90 transition-all"
                >
                  <RefreshCw size={16} />
                  Retry Quiz
                </button>
                <button
                  onClick={() => router.push(`/models/${slug}`)}
                  className="px-6 py-3 bg-bg-elevated border border-border text-muted rounded-xl font-semibold text-sm cursor-pointer hover:text-fg hover:border-border-light transition-all"
                >
                  Back to Path
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
