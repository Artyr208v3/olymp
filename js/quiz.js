class QuizManager {
  constructor() {
    this.questions = [];
    this.currentIndex = 0;
    this.userAnswers = [];
    this.totalScore = 0;
    this.maxScore = 0;
  }

  loadQuestions(questions) {
    this.questions = questions;
    this.currentIndex = 0;
    this.userAnswers = new Array(questions.length).fill(null);
    this.totalScore = 0;
    this.maxScore = questions.reduce((sum, q) => sum + (q.points || 1), 0);

    this.questions.forEach((q) => {
      if (!q.tags) q.tags = ["Общее"];
      if (!q.points) q.points = 1;
      if (!q.imageUrl) q.imageUrl = null;
    });
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex] || null;
  }

  checkAnswer(userAnswer) {
    const question = this.getCurrentQuestion();
    if (!question) return null;

    let isCorrect = false;
    let pointsEarned = 0;

    switch (question.type) {
      case "free":
        isCorrect =
          userAnswer.toLowerCase().trim() ===
          question.correctAnswer.toLowerCase().trim();
        pointsEarned = isCorrect ? question.points : 0;
        break;
      case "checkbox":
        const correctSorted = [...question.correctAnswer].sort();
        const userSorted = [...userAnswer].sort();
        isCorrect =
          JSON.stringify(correctSorted) === JSON.stringify(userSorted);
        pointsEarned = isCorrect ? question.points : 0;
        break;
      case "radio":
        isCorrect = userAnswer === question.correctAnswer;
        pointsEarned = isCorrect ? question.points : 0;
        break;
      case "image":
        isCorrect = userAnswer === question.correctAnswer;
        pointsEarned = isCorrect ? question.points : 0;
        break;
    }

    this.userAnswers[this.currentIndex] = {
      question: question.question,
      userAnswer: userAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect: isCorrect,
      points: pointsEarned,
      maxPoints: question.points,
      type: question.type,
      tags: question.tags,
    };

    if (isCorrect) {
      this.totalScore += pointsEarned;
    }

    return {
      isCorrect,
      pointsEarned,
      maxPoints: question.points,
      correctAnswer: question.correctAnswer,
    };
  }

  nextQuestion() {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      return true;
    }
    return false;
  }

  getTagsStats() {
    const tagsStats = {};

    this.userAnswers.forEach((answer, index) => {
      if (!answer) return;

      const question = this.questions[index];
      question.tags.forEach((tag) => {
        if (!tagsStats[tag]) {
          tagsStats[tag] = {
            total: 0,
            correct: 0,
            points: 0,
            maxPoints: 0,
          };
        }

        tagsStats[tag].total++;
        tagsStats[tag].maxPoints += question.points;

        if (answer.isCorrect) {
          tagsStats[tag].correct++;
          tagsStats[tag].points += answer.points;
        }
      });
    });

    return tagsStats;
  }

  getOverallStats() {
    const answeredQuestions = this.userAnswers.filter((a) => a !== null);
    const correctCount = answeredQuestions.filter((a) => a.isCorrect).length;
    const wrongCount = answeredQuestions.length - correctCount;

    return {
      totalQuestions: this.questions.length,
      answeredQuestions: answeredQuestions.length,
      correctCount,
      wrongCount,
      totalScore: this.totalScore,
      maxScore: this.maxScore,
      percentage:
        this.maxScore > 0
          ? Math.round((this.totalScore / this.maxScore) * 100)
          : 0,
    };
  }

  exportResults() {
    const stats = this.getOverallStats();
    const tagsStats = this.getTagsStats();

    return {
      exportDate: new Date().toISOString(),
      overall: stats,
      tags: tagsStats,
      answers: this.userAnswers.filter((a) => a !== null),
    };
  }
}
