const quizManager = new QuizManager();
const chartManager = new ChartManager();

const jsonFileInput = document.getElementById("jsonFile");
const loader = document.getElementById("loader");
const content = document.getElementById("content");
const errorDiv = document.getElementById("error");
const quizTab = document.getElementById("quizTab");
const resultsTab = document.getElementById("resultsTab");
const navTabs = document.querySelectorAll(".nav-tab");

let currentQuestion = null;

document.addEventListener("DOMContentLoaded", function () {
  initEventListeners();

  window.imageStore = {};
});

function initEventListeners() {
  if (jsonFileInput) {
    jsonFileInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (!file) return;

      showLoader(true);

      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".zip")) {
        handleZipUpload(file);
      } else {
        handleJsonFile(file);
      }
    });
  }

  if (navTabs) {
    navTabs.forEach((tab) => {
      tab.addEventListener("click", () => switchTab(tab.dataset.tab));
    });
  }

  const checkBtn = document.getElementById("checkBtn");
  if (checkBtn) {
    checkBtn.addEventListener("click", handleCheckAnswer);
  }

  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", handleNextQuestion);
  }

  const exportBtn = document.getElementById("exportResultsBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportResults);
  }
}

function handleJsonFile(file) {
  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const data = JSON.parse(event.target.result);
      let questions = [];

      if (Array.isArray(data)) {
        questions = data;
      } else if (Array.isArray(data.questions)) {
        questions = data.questions;
      } else {
        throw new Error("Неверный формат JSON. Ожидается массив вопросов");
      }

      quizManager.loadQuestions(questions);

      displayQuestion();

      showContent(true);
      showError(false);

      switchTab("quiz");

      showNotification("JSON файл успешно загружен!", "success");
    } catch (error) {
      showError("Ошибка в файле: " + error.message);
      showContent(false);
    }
    showLoader(false);
  };
  reader.readAsText(file);
}

function handleZipUpload(file) {
  if (typeof JSZip === "undefined") {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    script.onload = function () {
      processZipFile(file);
    };
    script.onerror = function () {
      showError("Не удалось загрузить библиотеку для работы с ZIP");
      showLoader(false);
    };
    document.head.appendChild(script);
  } else {
    processZipFile(file);
  }
}

function processZipFile(file) {
  const zip = new JSZip();

  zip
    .loadAsync(file)
    .then(async function (contents) {
      let jsonFile = null;
      let jsonContent = null;
      let imagePromises = [];

      const fileEntries = [];
      contents.forEach(function (relativePath, zipEntry) {
        if (!zipEntry.dir) {
          fileEntries.push({ path: relativePath, entry: zipEntry });
        }
      });

      for (const entry of fileEntries) {
        if (entry.path.endsWith(".json")) {
          jsonFile = entry.entry;
          jsonContent = await jsonFile.async("string");
          break;
        }
      }

      if (!jsonContent) {
        throw new Error("В архиве не найден JSON файл с вопросами");
      }

      const data = JSON.parse(jsonContent);
      let questions = [];

      if (Array.isArray(data)) {
        questions = data;
      } else if (Array.isArray(data.questions)) {
        questions = data.questions;
      } else {
        throw new Error("Неверный формат JSON в архиве");
      }

      window.imageStore = window.imageStore || {};

for (const entry of fileEntries) {
    if (entry.path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        const imageName = entry.path.split('/').pop();
        try {
            const imageData = await entry.entry.async('base64');
            const mimeType = getMimeType(entry.path);
            const dataUrl = `data:${mimeType};base64,${imageData}`;
            
            window.imageStore[imageName] = dataUrl;
            console.log('Загружено изображение из ZIP:', imageName);
        } catch (e) {
            console.warn('Не удалось загрузить изображение:', entry.path);
        }
    }
}

questions = questions.map(q => {
    if (q.type === 'image') {
        if (q.imageName && window.imageStore[q.imageName]) {
            q.imageData = window.imageStore[q.imageName];
            console.log('Привязано изображение к вопросу:', q.imageName);
        } else if (q.imageUrl) {
            const imageName = q.imageUrl.split('/').pop();
            if (window.imageStore[imageName]) {
                q.imageData = window.imageStore[imageName];
                q.imageName = imageName;
                console.log('Привязано изображение по URL:', imageName);
            }
        }
    }
    return q;
});

      quizManager.loadQuestions(questions);

      displayQuestion();

      showContent(true);
      showError(false);

      switchTab("quiz");

      showLoader(false);
      showNotification("ZIP архив успешно загружен!", "success");
    })
    .catch(function (error) {
      showError("Ошибка при обработке ZIP: " + error.message);
      showContent(false);
      showLoader(false);
    });
}

function getMimeType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const mimes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };
  return mimes[ext] || "image/jpeg";
}

function showNotification(message, type = "info") {
  const oldNotification = document.getElementById("notification");
  if (oldNotification) {
    oldNotification.remove();
  }

  const notification = document.createElement("div");
  notification.id = "notification";
  notification.textContent = message;

  notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        transform: translateX(400px);
        transition: transform 0.3s;
        z-index: 9999;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;

  if (type === "success") {
    notification.style.background = "linear-gradient(135deg, #27ae60, #2ecc71)";
  } else if (type === "error") {
    notification.style.background = "linear-gradient(135deg, #c0392b, #e74c3c)";
  } else {
    notification.style.background = "linear-gradient(135deg, #3498db, #2980b9)";
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.transform = "translateX(0)";
  }, 100);

  setTimeout(() => {
    notification.style.transform = "translateX(400px)";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 3000);
}

function displayQuestion() {
  const question = quizManager.getCurrentQuestion();
  if (!question) return;

  currentQuestion = question;

  const currentIndex = quizManager.currentIndex;
  const totalQuestions = quizManager.questions.length;
  document.getElementById("counter").textContent =
    `Вопрос ${currentIndex + 1} из ${totalQuestions}`;

  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  document.getElementById("progressFill").style.width = `${progress}%`;

  document.getElementById("scoreDisplay").innerHTML =
    `⭐ ${quizManager.totalScore} / ${quizManager.maxScore} баллов`;

  document.getElementById("question").textContent = question.question;

  document.getElementById("questionTag").innerHTML =
    `🏷️ ${question.tags ? question.tags.join(", ") : "Общее"}`;
  document.getElementById("questionPoints").innerHTML =
    `⭐ ${question.points || 1} балл${(question.points || 1) > 1 ? "а" : ""}`;

  generateAnswerField(question);

  document.getElementById("correctAnswer").classList.remove("show");
}

// ========== ОТОБРАЖЕНИЕ ВОПРОСА С ИЗОБРАЖЕНИЕМ ==========
function generateAnswerField(question) {
    const answersArea = document.getElementById('answersArea');
    
    switch(question.type) {
        case 'free':
            answersArea.innerHTML = '<input type="text" class="free-answer" id="userAnswer" placeholder="Введите ваш ответ">';
            break;
            
        case 'checkbox':
            let html = '<div class="checkbox-group" id="userAnswer">';
            question.options.forEach(option => {
                html += `
                    <label class="checkbox-item">
                        <input type="checkbox" value="${option}">
                        ${option}
                    </label>
                `;
            });
            html += '</div>';
            answersArea.innerHTML = html;
            break;
            
        case 'radio':
            let radioHtml = '<div class="radio-group" id="userAnswer">';
            question.options.forEach(option => {
                radioHtml += `
                    <label class="radio-item">
                        <input type="radio" name="radioGroup" value="${option}">
                        ${option}
                    </label>
                `;
            });
            radioHtml += '</div>';
            answersArea.innerHTML = radioHtml;
            break;
            
        case 'image':
            let imageHtml = '';
            
            let imageUrl = null;
            
            if (question.imageData) {
                imageUrl = question.imageData;
                console.log('Загружаем изображение из imageData');
            }
            else if (question.imageName && window.imageStore && window.imageStore[question.imageName]) {
                imageUrl = window.imageStore[question.imageName];
                console.log('Загружаем изображение из imageStore');
            }
            else if (question.imageUrl) {
                imageUrl = question.imageUrl;
                console.log('Загружаем изображение по URL:', imageUrl);
            }
            
            if (imageUrl) {
                imageHtml += `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="${imageUrl}" 
                             alt="Изображение к вопросу" 
                             style="max-width: 100%; max-height: 300px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);"
                             onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'><rect width=\'200\' height=\'200\' fill=\'%23f0f0f0\'/><text x=\'50%\' y=\'50%\' font-size=\'14\' text-anchor=\'middle\' fill=\'%23999\'>Изображение не загрузилось</text></svg>';">
                    </div>
                `;
            } else {
                imageHtml += `
                    <div style="text-align: center; margin-bottom: 20px; padding: 40px; background: #f8f9fa; border-radius: 10px;">
                        <i class="fas fa-image" style="font-size: 48px; color: #ccc;"></i>
                        <p style="color: #999; margin-top: 10px;">Изображение отсутствует</p>
                    </div>
                `;
            }
            
            if (question.options && question.options.length > 0) {
                imageHtml += '<div class="radio-group" id="userAnswer">';
                question.options.forEach(option => {
                    imageHtml += `
                        <label class="radio-item">
                            <input type="radio" name="radioGroup" value="${option}">
                            ${option}
                        </label>
                    `;
                });
                imageHtml += '</div>';
            } else {
                imageHtml += '<p class="error">Нет вариантов ответа</p>';
            }
            
            answersArea.innerHTML = imageHtml;
            
            if (!document.querySelector('link[href*="font-awesome"]')) {
                const fa = document.createElement('link');
                fa.rel = 'stylesheet';
                fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
                document.head.appendChild(fa);
            }
            break;
            
        default:
            answersArea.innerHTML = '<p class="error">Неизвестный тип вопроса</p>';
    }
}

// ========== ПРОВЕРКА ОТВЕТА ==========
function handleCheckAnswer() {
    if (!currentQuestion) return;
    
    let userAnswer = '';
    
    switch(currentQuestion.type) {
        case 'free':
            userAnswer = document.getElementById('userAnswer')?.value || '';
            break;
        case 'checkbox':
            const checkboxes = document.querySelectorAll('#userAnswer input[type="checkbox"]:checked');
            userAnswer = Array.from(checkboxes).map(cb => cb.value);
            break;
        case 'radio':
        case 'image':
            const radio = document.querySelector('input[name="radioGroup"]:checked');
            userAnswer = radio ? radio.value : 'Ничего не выбрано';
            break;
    }
    
    // Проверяем ответ через менеджер
    const result = quizManager.checkAnswer(userAnswer);
    
    // Показываем результат
    displayResult(currentQuestion, userAnswer, result);
    
    // Обновляем счет
    document.getElementById('scoreDisplay').innerHTML = 
        `⭐ ${quizManager.totalScore} / ${quizManager.maxScore} баллов`;
}

// ========== ОТОБРАЖЕНИЕ РЕЗУЛЬТАТА ==========
function displayResult(question, userAnswer, result) {
    const correctDiv = document.getElementById('correctAnswer');
    
    // Определяем сообщение в зависимости от наличия ответа
    let resultMessage = '';
    let resultClass = '';
    
    if (result.hasNoAnswer) {
        resultMessage = '❌ Ответ не дан!';
        resultClass = 'badge-incorrect';
    } else {
        resultMessage = result.isCorrect 
            ? `✅ Верно! +${result.pointsEarned} балл${result.pointsEarned > 1 ? 'а' : ''}` 
            : '❌ Неверно!';
        resultClass = result.isCorrect ? 'badge-correct' : 'badge-incorrect';
    }
    
    let resultHtml = `
        <div class="result-badge ${resultClass}">
            ${resultMessage}
        </div>
    `;
    
    switch(question.type) {
        case 'free':
            resultHtml += `
                <div style="margin-bottom: 15px;">
                    <strong>Правильный ответ:</strong> 
                    <span class="answer-item answer-correct">${result.correctAnswer}</span>
                </div>
                <div>
                    <strong>Ваш ответ:</strong> 
                    <span class="answer-item ${result.hasNoAnswer ? 'answer-incorrect' : (result.isCorrect ? 'answer-correct' : 'answer-incorrect')}">
                        ${result.hasNoAnswer ? '❌ Нет ответа' : (userAnswer || '(пусто)')}
                    </span>
                </div>
            `;
            break;
            
        case 'checkbox':
            resultHtml += `
                <div style="margin-bottom: 15px;">
                    <strong>Правильные ответы:</strong><br>
                    ${result.correctAnswer.map(a => `<span class="answer-item answer-correct">${a}</span>`).join('')}
                </div>
                <div>
                    <strong>Ваш ответ:</strong><br>
            `;
            
            if (result.hasNoAnswer) {
                resultHtml += `<span class="answer-item answer-incorrect">❌ Ничего не выбрано</span>`;
            } else if (userAnswer.length === 0) {
                resultHtml += `<span class="answer-item answer-incorrect">(ничего не выбрано)</span>`;
            } else {
                userAnswer.forEach(answer => {
                    const isAnswerCorrect = result.correctAnswer.includes(answer);
                    const className = isAnswerCorrect ? 'answer-correct' : 'answer-incorrect';
                    resultHtml += `<span class="answer-item ${className}">${answer}</span>`;
                });
            }
            
            if (!result.hasNoAnswer) {
                const missingAnswers = result.correctAnswer.filter(a => !userAnswer.includes(a));
                if (missingAnswers.length > 0) {
                    resultHtml += `<div style="margin-top: 15px;"><strong>Пропущены:</strong><br>`;
                    missingAnswers.forEach(answer => {
                        resultHtml += `<span class="answer-item answer-missing">${answer}</span>`;
                    });
                    resultHtml += `</div>`;
                }
            }
            break;
            
        case 'radio':
        case 'image':
            resultHtml += `
                <div style="margin-bottom: 15px;">
                    <strong>Правильный ответ:</strong> 
                    <span class="answer-item answer-correct">${result.correctAnswer}</span>
                </div>
                <div>
                    <strong>Ваш ответ:</strong> 
                    <span class="answer-item ${result.hasNoAnswer ? 'answer-incorrect' : (result.isCorrect ? 'answer-correct' : 'answer-incorrect')}">
                        ${result.hasNoAnswer ? '❌ Нет ответа' : userAnswer}
                    </span>
                </div>
            `;
            break;
    }
    
    // Добавляем подсказку если ответ не был дан
    if (result.hasNoAnswer) {
        resultHtml += `
            <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 8px; color: #856404;">
                <i class="fas fa-info-circle"></i> 
                Ответ не был выбран. За такие вопросы баллы не начисляются.
            </div>
        `;
    }
    
    correctDiv.innerHTML = resultHtml;
    correctDiv.classList.add('show');
    correctDiv.classList.remove('correct', 'incorrect');
    correctDiv.classList.add(result.isCorrect ? 'correct' : 'incorrect');
}

function handleNextQuestion() {
  if (quizManager.nextQuestion()) {
    displayQuestion();
  } else {
    alert("🎉 Тест завершен! Переключаю на вкладку с результатами.");
    showResults();
    switchTab("results");
  }
}

function showResults() {
    console.log('Показываем результаты...');
    
    const stats = quizManager.getOverallStats();
    const tagsStats = quizManager.getTagsStats();
    
    console.log('Статистика для отображения:', stats);
    
    const totalQuestionsEl = document.getElementById('totalQuestions');
    const correctAnswersEl = document.getElementById('correctAnswers');
    const wrongAnswersEl = document.getElementById('wrongAnswers');
    const noAnswerCountEl = document.getElementById('noAnswerCount');
    const unansweredCountEl = document.getElementById('unansweredCount');
    const totalScoreEl = document.getElementById('totalScore');
    
    if (totalQuestionsEl) totalQuestionsEl.textContent = stats.totalQuestions || 0;
    if (correctAnswersEl) correctAnswersEl.textContent = stats.correctCount || 0;
    if (wrongAnswersEl) wrongAnswersEl.textContent = stats.incorrectCount || 0;
    if (noAnswerCountEl) noAnswerCountEl.textContent = stats.noAnswerCount || 0;
    if (unansweredCountEl) unansweredCountEl.textContent = stats.unansweredCount || 0;
    if (totalScoreEl) totalScoreEl.textContent = `${stats.totalScore || 0} / ${stats.maxScore || 0}`;
    
    setTimeout(() => {
        try {
            chartManager.updateChart(stats);
            console.log('Диаграмма создана');
        } catch (e) {
            console.error('Ошибка создания диаграммы:', e);
        }
    }, 100); 
    
    displayTagsStats(tagsStats);
    
    displayDetailedResults();
}

function displayTagsStats(tagsStats) {
    const container = document.getElementById('tagsStatsContainer');
    if (!container) return;
    
    let html = '';
    
    if (Object.keys(tagsStats).length === 0) {
        html = '<p style="text-align: center; color: #999; padding: 20px;">Нет данных по категориям</p>';
    } else {
        for (const [tag, stats] of Object.entries(tagsStats)) {
            const correctPercent = stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : 0;
            
            html += `
                <div class="tag-card">
                    <div class="tag-name">🏷️ ${tag}</div>
                    <div class="tag-stats">
                        <div>✅ Верно: ${stats.correct}/${stats.answered}</div>
                        <div>⭐ Баллы: ${stats.points}/${stats.maxPoints}</div>
                        <div>📊 Успех: ${correctPercent}%</div>
                    </div>
                </div>
            `;
        }
    }
    
    container.innerHTML = html;
}

function displayDetailedResults() {
    const container = document.getElementById('detailedResults');
    if (!container) return;
    
    const answers = quizManager.userAnswers.filter(a => a !== null && a.answered === true);
    
    let html = '';
    
    if (answers.length === 0) {
        html = '<p style="text-align: center; color: #999; padding: 20px;">Нет отвеченных вопросов</p>';
    } else {
        answers.forEach((answer, index) => {
            const statusClass = answer.isCorrect ? 'status-correct' : 'status-incorrect';
            const statusText = answer.isCorrect 
                ? `✅ +${answer.points}` 
                : answer.hasNoAnswer ? '⏭️ Пропущено' : '❌ 0';
            
            html += `
                <div class="question-result-item">
                    <div class="question-result-info">
                        <div class="question-result-text">${index + 1}. ${answer.question}</div>
                        <div class="question-result-meta">
                            Ваш ответ: ${formatAnswer(answer.userAnswerDisplay)}<br>
                            Правильный ответ: ${formatAnswer(answer.correctAnswer)}
                        </div>
                    </div>
                    <div class="question-result-status ${statusClass}">
                        ${statusText}/${answer.maxPoints}
                    </div>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
}

function formatAnswer(answer) {
    if (answer === null || answer === undefined) return 'Нет ответа';
    if (Array.isArray(answer)) return answer.join(', ') || 'Ничего не выбрано';
    return answer.toString();
}

function exportResults() {
  const results = quizManager.exportResults();

  const dataStr = JSON.stringify(results, null, 2);
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  const exportFileDefaultName = `quiz_results_${new Date().toISOString().slice(0, 10)}.json`;

  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
}

function switchTab(tabName) {
  navTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  quizTab.classList.toggle("active", tabName === "quiz");
  resultsTab.classList.toggle("active", tabName === "results");

  if (tabName === "results") {
    showResults();
  }
}

function showLoader(show) {
  loader.style.display = show ? "block" : "none";
}

function showContent(show) {
  content.style.display = show ? "block" : "none";
}

function showError(show, message = "") {
  if (show) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  } else {
    errorDiv.style.display = "none";
  }
}
