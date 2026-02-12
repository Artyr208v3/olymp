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
        
        this.questions.forEach(q => {
            if (!q.tags) q.tags = ['Общее'];
            if (!q.points) q.points = 1;
        });
        
        console.log('Загружено вопросов:', this.questions.length);
        console.log('Макс баллов:', this.maxScore);
    }

    getCurrentQuestion() {
        return this.questions[this.currentIndex] || null;
    }

    checkAnswer(userAnswer) {
        const question = this.getCurrentQuestion();
        if (!question) return null;

        let isCorrect = false;
        let pointsEarned = 0;
        
        const hasNoAnswer = this.checkNoAnswer(userAnswer, question.type);
        
        console.log('Проверка ответа:', {
            type: question.type,
            userAnswer: userAnswer,
            hasNoAnswer: hasNoAnswer
        });

        if (hasNoAnswer) {
            isCorrect = false;
            pointsEarned = 0;
        } else {
            switch(question.type) {
                case 'free':
                    isCorrect = userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
                    pointsEarned = isCorrect ? question.points : 0;
                    break;
                case 'checkbox':
                    const correctSorted = [...question.correctAnswer].sort();
                    const userSorted = [...userAnswer].sort();
                    isCorrect = JSON.stringify(correctSorted) === JSON.stringify(userSorted);
                    pointsEarned = isCorrect ? question.points : 0;
                    break;
                case 'radio':
                case 'image':
                    isCorrect = userAnswer === question.correctAnswer;
                    pointsEarned = isCorrect ? question.points : 0;
                    break;
            }
        }

        this.userAnswers[this.currentIndex] = {
            questionId: this.currentIndex,
            question: question.question,
            userAnswer: hasNoAnswer ? null : userAnswer,
            userAnswerDisplay: hasNoAnswer ? 'Нет ответа' : userAnswer,
            correctAnswer: question.correctAnswer,
            isCorrect: isCorrect,
            points: pointsEarned,
            maxPoints: question.points,
            type: question.type,
            tags: question.tags || ['Общее'],
            hasNoAnswer: hasNoAnswer,
            answered: true
        };

        if (isCorrect) {
            this.totalScore += pointsEarned;
        }

        console.log('Результат:', {
            isCorrect,
            pointsEarned,
            hasNoAnswer,
            totalScore: this.totalScore
        });

        return {
            isCorrect,
            pointsEarned,
            maxPoints: question.points,
            correctAnswer: question.correctAnswer,
            hasNoAnswer: hasNoAnswer
        };
    }

    checkNoAnswer(userAnswer, type) {
        if (userAnswer === undefined || userAnswer === null) return true;
        
        switch(type) {
            case 'free':
                return userAnswer.toString().trim() === '';
            case 'checkbox':
                return !Array.isArray(userAnswer) || userAnswer.length === 0;
            case 'radio':
            case 'image':
                return !userAnswer || userAnswer === 'Ничего не выбрано' || userAnswer.toString().trim() === '';
            default:
                return false;
        }
    }

    nextQuestion() {
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++;
            return true;
        }
        return false;
    }

    getOverallStats() {
        const answeredQuestions = this.userAnswers.filter(a => a !== null && a.answered === true);
        const correctCount = answeredQuestions.filter(a => a.isCorrect === true).length;
        
        const incorrectCount = answeredQuestions.filter(a => a.isCorrect === false && a.hasNoAnswer === false).length;
        
        const noAnswerCount = answeredQuestions.filter(a => a.hasNoAnswer === true).length;
        
        const unansweredCount = this.questions.length - answeredQuestions.length;
        
        const totalScore = answeredQuestions
            .filter(a => a.isCorrect === true)
            .reduce((sum, a) => sum + (a.points || 0), 0);
        
        const stats = {
            totalQuestions: this.questions.length,
            answeredQuestions: answeredQuestions.length,
            correctCount: correctCount,
            incorrectCount: incorrectCount,
            noAnswerCount: noAnswerCount,
            unansweredCount: unansweredCount,
            totalScore: totalScore,
            maxScore: this.maxScore,
            percentage: this.maxScore > 0 ? Math.round((totalScore / this.maxScore) * 100) : 0
        };
        
        console.log('Статистика:', stats);
        return stats;
    }

    getTagsStats() {
        const tagsStats = {};
        const answeredQuestions = this.userAnswers.filter(a => a !== null && a.answered === true);

        answeredQuestions.forEach((answer, index) => {
            const tags = answer.tags || ['Общее'];
            tags.forEach(tag => {
                if (!tagsStats[tag]) {
                    tagsStats[tag] = {
                        total: 0,
                        answered: 0,
                        correct: 0,
                        incorrect: 0,
                        noAnswer: 0,
                        points: 0,
                        maxPoints: 0
                    };
                }
                
                const question = this.questions[answer.questionId];
                const maxPoints = question ? (question.points || 1) : 1;
                
                tagsStats[tag].total++;
                tagsStats[tag].maxPoints += maxPoints;
                
                if (answer.answered) {
                    tagsStats[tag].answered++;
                    
                    if (answer.hasNoAnswer) {
                        tagsStats[tag].noAnswer++;
                        tagsStats[tag].incorrect++;
                    } else if (answer.isCorrect) {
                        tagsStats[tag].correct++;
                        tagsStats[tag].points += answer.points || 0;
                    } else {
                        tagsStats[tag].incorrect++;
                    }
                }
            });
        });

        return tagsStats;
    }

    exportResults() {
        const stats = this.getOverallStats();
        const tagsStats = this.getTagsStats();
        
        return {
            exportDate: new Date().toISOString(),
            overall: stats,
            tags: tagsStats,
            answers: this.userAnswers.filter(a => a !== null && a.answered === true)
        };
    }
}