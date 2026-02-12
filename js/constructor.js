let questions = [];
let currentEditId = null;
let tagsList = [];
let imageStore = {};

document.addEventListener("DOMContentLoaded", function () {
  loadFromStorage();

  initDragAndDrop();

  updateQuestionsList();
  updateStats();
});

function loadFromStorage() {
  const saved = localStorage.getItem("quizConstructor");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      questions = data.questions || [];
      imageStore = data.images || {};
    } catch (e) {
      console.error("Ошибка загрузки из localStorage");
    }
  }
}

function saveToStorage() {
  questions = questions.map((q) => {
    if (!q.tags || !Array.isArray(q.tags) || q.tags.length === 0) {
      q.tags = ["Общее"];
    }
    return q;
  });

  const data = {
    questions: questions,
    images: imageStore,
    lastModified: new Date().toISOString(),
  };
  localStorage.setItem("quizConstructor", JSON.stringify(data));
  updateStats();
  console.log("Сохранено в localStorage, вопросы:", questions.length);
}

function createNewQuestion() {
  resetForm();

  currentEditId = null;
  document.getElementById("formTitle").innerHTML =
    '<i class="fas fa-plus"></i> Создание нового вопроса';
  document.getElementById("questionForm").style.display = "block";
  document.getElementById("emptyState").style.display = "none";

  tagsList = [];
  updateTagsList();

  document.getElementById("correctAnswerLabel").style.display = "block";
  document.getElementById("correctAnswerInput").style.display = "block";

  document.getElementById("questionType").value = "free";
  onQuestionTypeChange();

  showNotification("Форма очищена для нового вопроса", "info");
}

function editQuestion(id) {
  const idStr = id.toString();

  const question = questions.find((q) => {
    if (!q.id) return false;
    return q.id.toString() === idStr;
  });

  if (!question) {
    console.error("Вопрос не найден:", id);
    showNotification("Вопрос не найден", "error");
    return;
  }

  resetForm();

  currentEditId = question.id;
  document.getElementById("formTitle").innerHTML =
    '<i class="fas fa-edit"></i> Редактирование вопроса';
  document.getElementById("questionForm").style.display = "block";
  document.getElementById("emptyState").style.display = "none";

  document.getElementById("questionId").value = question.id;
  document.getElementById("questionType").value = question.type || "free";
  document.getElementById("questionPoints").value = question.points || 1;
  document.getElementById("questionText").value = question.question || "";

  if (
    question.tags &&
    Array.isArray(question.tags) &&
    question.tags.length > 0
  ) {
    tagsList = [...question.tags];
  } else {
    tagsList = ["Общее"];
  }
  updateTagsList();
  console.log("Загружены теги при редактировании:", tagsList);

  onQuestionTypeChange();

  if (question.options && question.options.length > 0) {
    renderOptions(question.options);
  } else if (
    question.type === "checkbox" ||
    question.type === "radio" ||
    question.type === "image"
  ) {
    addOption();
    addOption();
  }

  if (question.type === "image") {
    if (question.imageData) {
      showImagePreview(question.imageData, question.imageName || "image.jpg");
      document.getElementById("imageData").value = question.imageData;
      document.getElementById("imageName").value =
        question.imageName || "image.jpg";
    } else if (question.imageUrl && question.imageUrl.startsWith("images/")) {
      const imageName = question.imageUrl.replace("images/", "");
      if (imageStore[imageName]) {
        showImagePreview(imageStore[imageName], imageName);
        document.getElementById("imageData").value = imageStore[imageName];
        document.getElementById("imageName").value = imageName;
      }
    }
  }

  setTimeout(() => {
    updateCorrectAnswerInput(question.type, question.correctAnswer);
  }, 50);
}

function deleteQuestion(id) {
  if (confirm("Вы уверены, что хотите удалить этот вопрос?")) {
    const idStr = id.toString();

    const index = questions.findIndex((q) => {
      if (!q.id) return false;
      return q.id.toString() === idStr;
    });

    if (index !== -1) {
      questions.splice(index, 1);

      saveToStorage();

      updateQuestionsList();
      updateStats();

      if (questions.length === 0) {
        document.getElementById("emptyState").style.display = "block";
        document.getElementById("questionForm").style.display = "none";
      }

      showNotification("Вопрос успешно удален", "success");
      console.log("Вопрос удален, осталось вопросов:", questions.length);
    } else {
      console.error("Вопрос с id", id, "не найден");
      showNotification("Ошибка: вопрос не найден", "error");
    }
  }
}

function duplicateQuestion(id) {
  const idStr = id.toString();

  const original = questions.find((q) => {
    if (!q.id) return false;
    return q.id.toString() === idStr;
  });

  if (original) {
    const duplicate = JSON.parse(JSON.stringify(original));

    duplicate.id =
      "q_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    duplicate.question = original.question + " (копия)";

    questions.push(duplicate);

    saveToStorage();

    updateQuestionsList();
    updateStats();

    showNotification("Вопрос скопирован", "success");
    console.log("Вопрос скопирован, новый id:", duplicate.id);
  } else {
    console.error("Оригинал вопроса не найден:", id);
    showNotification("Ошибка: вопрос не найден", "error");
  }
}

function saveQuestion() {
  const questionText = document.getElementById("questionText").value.trim();
  if (!questionText) {
    showNotification("Введите текст вопроса", "error");
    return;
  }

  const type = document.getElementById("questionType").value;
  const points = parseInt(document.getElementById("questionPoints").value) || 1;

  let options = [];
  if (type === "checkbox" || type === "radio" || type === "image") {
    const optionInputs = document.querySelectorAll(".option-input");
    options = Array.from(optionInputs)
      .map((input) => input.value.trim())
      .filter((v) => v);

    if (options.length < 2) {
      showNotification("Добавьте минимум 2 варианта ответа", "error");
      return;
    }
  }

  let correctAnswer = getCorrectAnswer();
  if (
    !correctAnswer ||
    (Array.isArray(correctAnswer) && correctAnswer.length === 0)
  ) {
    showNotification("Укажите правильный ответ(ы)", "error");
    return;
  }

  const question = {
    id:
      currentEditId ||
      "q_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
    type: type,
    question: questionText,
    points: points,
    tags: tagsList && tagsList.length > 0 ? [...tagsList] : ["Общее"],
    correctAnswer: correctAnswer,
  };

  if (options.length > 0) {
    question.options = options;
  }

  if (type === "image") {
    const imageData = document.getElementById("imageData").value;
    const imageName = document.getElementById("imageName").value;

    if (imageData && imageName) {
      question.imageData = imageData;
      question.imageName = imageName;
      question.imageUrl = "images/" + imageName;

      imageStore[imageName] = imageData;

      console.log(
        "Сохранено изображение:",
        imageName,
        imageData.substring(0, 50) + "...",
      );
    } else {
      showNotification("Загрузите изображение", "error");
      return;
    }
  }

  if (currentEditId) {
    const index = questions.findIndex((q) => q.id === currentEditId);
    if (index !== -1) {
      questions[index] = question;
    }
  } else {
    questions.push(question);
  }

  saveToStorage();
  updateQuestionsList();
  updateStats();
  cancelForm();

  showNotification(
    currentEditId ? "Вопрос обновлен" : "Вопрос создан",
    "success",
  );
}

function cancelForm() {
  document.getElementById("questionForm").style.display = "none";
  resetForm();

  if (questions.length === 0) {
    document.getElementById("emptyState").style.display = "block";
  }
}

function resetForm() {
  document.getElementById("questionId").value = "";
  document.getElementById("questionText").value = "";
  document.getElementById("questionPoints").value = "1";
  document.getElementById("questionType").value = "free";

  tagsList = [];
  updateTagsList();

  const tagInput = document.getElementById("tagInput");
  if (tagInput) tagInput.value = "";

  const tagsListDiv = document.getElementById("tagsList");
  if (tagsListDiv) tagsListDiv.innerHTML = "";
  document.getElementById("tagInput").value = "";

  const optionsList = document.getElementById("optionsList");
  optionsList.innerHTML = "";

  document.getElementById("imageData").value = "";
  document.getElementById("imageName").value = "";
  document.getElementById("imagePreview").src = "";
  document.getElementById("imagePreview").classList.remove("show");

  const uploadText = document.querySelector("#imageUploadArea p");
  if (uploadText) {
    uploadText.innerHTML = "Нажмите для загрузки изображения";
  }

  const correctContainer = document.getElementById("correctAnswerInput");
  correctContainer.innerHTML =
    '<input type="text" id="correctAnswer" class="form-control" placeholder="Введите правильный ответ">';

  document.getElementById("imageUploadGroup").style.display = "none";
  document.getElementById("optionsGroup").style.display = "none";

  currentEditId = null;
}

function onQuestionTypeChange() {
  const type = document.getElementById("questionType").value;

  document.getElementById("imageUploadGroup").style.display =
    type === "image" ? "block" : "none";
  document.getElementById("optionsGroup").style.display =
    type === "checkbox" || type === "radio" || type === "image"
      ? "block"
      : "none";

  document.getElementById("correctAnswerLabel").style.display = "block";
  document.getElementById("correctAnswerInput").style.display = "block";

  if (
    (type === "checkbox" || type === "radio" || type === "image") &&
    !currentEditId
  ) {
    const optionsList = document.getElementById("optionsList");
    if (!optionsList.children.length) {
      addOption();
      addOption();
    }
  }

  updateCorrectAnswerInput(type);
}

function updateCorrectAnswerInput(type, selectedValue = null) {
  const container = document.getElementById("correctAnswerInput");
  if (!container) return;

  switch (type) {
    case "free":
      container.innerHTML = `
                <input type="text" id="correctAnswer" class="form-control" 
                       placeholder="Введите правильный ответ" value="${selectedValue || ""}">
            `;
      break;

    case "radio":
    case "image":
      const radioOptions = getCurrentOptions();
      if (radioOptions.length === 0) {
        container.innerHTML =
          '<p style="color: #999;">Сначала добавьте варианты ответов</p>';
        break;
      }

      let radioHtml =
        '<div style="display: flex; flex-direction: column; gap: 10px;">';
      radioOptions.forEach((opt) => {
        const isChecked =
          selectedValue && selectedValue.toString() === opt.toString();
        radioHtml += `
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="radio" name="correctRadio" value="${opt}" 
                               ${isChecked ? "checked" : ""}>
                        ${opt}
                    </label>
                `;
      });
      radioHtml += "</div>";
      container.innerHTML = radioHtml;
      break;

    case "checkbox":
      const checkboxOptions = getCurrentOptions();
      if (checkboxOptions.length === 0) {
        container.innerHTML =
          '<p style="color: #999;">Сначала добавьте варианты ответов</p>';
        break;
      }

      let checkboxHtml =
        '<div style="display: flex; flex-direction: column; gap: 10px;">';
      checkboxOptions.forEach((opt) => {
        const isChecked =
          selectedValue &&
          Array.isArray(selectedValue) &&
          selectedValue.some((v) => v.toString() === opt.toString());
        checkboxHtml += `
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" class="correctCheckbox" value="${opt}" 
                               ${isChecked ? "checked" : ""}>
                        ${opt}
                    </label>
                `;
      });
      checkboxHtml += "</div>";
      container.innerHTML = checkboxHtml;
      break;

    default:
      container.innerHTML =
        '<input type="text" id="correctAnswer" class="form-control" placeholder="Введите правильный ответ">';
  }
}

function getCorrectAnswer() {
  const type = document.getElementById("questionType").value;

  switch (type) {
    case "free":
      return document.getElementById("correctAnswer")?.value || "";

    case "radio":
    case "image":
      const radio = document.querySelector(
        'input[name="correctRadio"]:checked',
      );
      return radio ? radio.value : "";

    case "checkbox":
      const checkboxes = document.querySelectorAll(".correctCheckbox:checked");
      return Array.from(checkboxes).map((cb) => cb.value);

    default:
      return "";
  }
}

function addOption(value = "") {
  const optionsList = document.getElementById("optionsList");
  const optionDiv = document.createElement("div");
  optionDiv.className = "option-item";
  optionDiv.innerHTML = `
                <input type="text" class="option-input" placeholder="Вариант ответа" value="${value}">
                <button type="button" class="remove-option" onclick="removeOption(this)">
                    <i class="fas fa-times"></i>
                </button>
            `;
  optionsList.appendChild(optionDiv);
}

function removeOption(btn) {
  const optionsList = document.getElementById("optionsList");
  if (optionsList.children.length > 1) {
    btn.closest(".option-item").remove();
    updateCorrectAnswerInput(document.getElementById("questionType").value);
  }
}

function renderOptions(options) {
  const optionsList = document.getElementById("optionsList");
  optionsList.innerHTML = "";

  if (options && options.length > 0) {
    options.forEach((opt) => addOption(opt));
  } else {
    addOption();
    addOption();
  }
}

function getCurrentOptions() {
  const inputs = document.querySelectorAll(".option-input");
  return Array.from(inputs)
    .map((input) => input.value.trim())
    .filter((v) => v);
}

function handleTagKeydown(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    const input = document.getElementById("tagInput");
    const tag = input.value.trim();

    if (tag) {
      if (!tagsList.includes(tag)) {
        tagsList.push(tag);
        updateTagsList();
        console.log("Добавлен тег:", tag, "Все теги:", tagsList);
      }
    }

    input.value = "";
  }
}

function removeTag(tagToRemove) {
  tagsList = tagsList.filter((tag) => tag !== tagToRemove);
  updateTagsList();
  console.log("Удален тег:", tagToRemove, "Остались:", tagsList);
}

function updateTagsList() {
  const tagsListDiv = document.getElementById("tagsList");
  if (!tagsListDiv) return;

  if (!tagsList || tagsList.length === 0) {
    tagsListDiv.innerHTML = "";
    return;
  }

  tagsListDiv.innerHTML = tagsList
    .map(
      (tag) => `
        <span class="tag-item">
            <i class="fas fa-tag"></i> ${tag}
            <i class="fas fa-times" onclick="removeTag('${tag}')" style="cursor: pointer; margin-left: 5px;"></i>
        </span>
    `,
    )
    .join("");

  console.log("Обновлены теги на экране:", tagsList);
}

function initDragAndDrop() {
  const dropArea = document.getElementById("imageUploadArea");

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  dropArea.addEventListener("drop", function (e) {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageFile(file);
    }
  });
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (file) {
    handleImageFile(file);
  }
}

function handleImageFile(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const imageData = e.target.result;
    const imageName = Date.now() + "_" + file.name;

    showImagePreview(imageData, imageName);

    document.getElementById("imageData").value = imageData;
    document.getElementById("imageName").value = imageName;
  };
  reader.readAsDataURL(file);
}

function showImagePreview(imageData, imageName) {
  const preview = document.getElementById("imagePreview");
  preview.src = imageData;
  preview.classList.add("show");

  const uploadText = document.querySelector("#imageUploadArea p");
  if (uploadText) {
    uploadText.innerHTML = `<strong>${imageName}</strong>`;
  }
}

function updateQuestionsList() {
  const listDiv = document.getElementById("questionsList");
  const counter = document.getElementById("questionCount");

  counter.textContent = questions.length;

  if (questions.length === 0) {
    listDiv.innerHTML = "";
    document.getElementById("emptyState").style.display = "block";
    return;
  }

  document.getElementById("emptyState").style.display = "none";

  let html = "";
  questions.forEach((q, index) => {
    const typeIcons = {
      free: "📝",
      radio: "🔘",
      checkbox: "✅",
      image: "🖼️",
    };

    html += `
                    <div class="question-card ${currentEditId === q.id ? "selected" : ""}">
                        <div class="question-header">
                            <div>
                                <span class="question-title">${index + 1}. ${q.question}</span>
                                <div class="question-badges" style="margin-top: 8px;">
                                    <span class="badge badge-type">
                                        ${typeIcons[q.type] || "📝"} ${getTypeName(q.type)}
                                    </span>
                                    <span class="badge badge-points">
                                        ⭐ ${q.points || 1} балл${(q.points || 1) > 1 ? "а" : ""}
                                    </span>
                                    ${
                                      q.tags &&
                                      Array.isArray(q.tags) &&
                                      q.tags.length > 0
                                        ? q.tags
                                            .map(
                                              (tag) => `
        <span class="badge badge-tag">
            <i class="fas fa-tag"></i> ${tag}
        </span>
      `,
                                            )
                                            .join("")
                                        : `
        <span class="badge badge-tag">
            <i class="fas fa-tag"></i> Общее
        </span>
    `
                                    }
                                </div>
                            </div>
                        </div>
                        
                        <div class="question-actions">
                            <button class="action-btn" onclick="editQuestion('${q.id}')" title="Редактировать">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" onclick="duplicateQuestion('${q.id}')" title="Копировать">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="action-btn delete" onclick="deleteQuestion('${q.id}')" title="Удалить">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
    console.log("Отображение вопроса:", { id: q.id, text: q.question });
  });

  listDiv.innerHTML = html;
}

function getTypeName(type) {
  const types = {
    free: "Свободный ответ",
    radio: "Один вариант",
    checkbox: "Несколько вариантов",
    image: "С изображением",
  };
  return types[type] || type;
}

function updateStats() {
  document.getElementById("statTotal").textContent = questions.length;

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
  document.getElementById("statPoints").textContent = totalPoints;

  const imagesCount = questions.filter((q) => q.type === "image").length;
  document.getElementById("statImages").textContent = imagesCount;

  const uniqueTags = new Set();
  questions.forEach((q) => {
    (q.tags || []).forEach((tag) => uniqueTags.add(tag));
  });
  document.getElementById("statTags").textContent = uniqueTags.size;
}

function exportAll() {
  document.getElementById("exportModal").classList.add("active");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

function exportJSON() {
  const questionsForExport = questions.map((q) => {
    const question = { ...q };

    delete question.id;

    if (question.type === "image" && question.imageData) {
      console.log("Экспортируем изображение:", question.imageName);
    }

    return question;
  });

  const data = {
    questions: questionsForExport,
    exportDate: new Date().toISOString(),
    version: "1.1",
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  saveAs(blob, `questions_${new Date().toISOString().slice(0, 10)}.json`);

  closeModal("exportModal");
  showNotification("JSON файл с изображениями сохранен", "success");
}

function exportWithImages() {
  showProgress(true);

  const zip = new JSZip();

  const jsonData = {
    questions: questions.map((q) => {
      const { imageData, ...question } = q;
      return question;
    }),
    exportDate: new Date().toISOString(),
  };

  zip.file("questions.json", JSON.stringify(jsonData, null, 2));

  const imagesFolder = zip.folder("images");
  questions.forEach((q) => {
    if (q.type === "image" && q.imageName && imageStore[q.imageName]) {
      const imageData = imageStore[q.imageName].split(",")[1];
      imagesFolder.file(q.imageName, imageData, { base64: true });
    }
  });

  zip.generateAsync({ type: "blob" }).then(function (content) {
    saveAs(
      content,
      `quiz_project_${new Date().toISOString().slice(0, 10)}.zip`,
    );
    showProgress(false);
    closeModal("exportModal");
    showNotification("Проект с изображениями сохранен", "success");
  });
}

function exportHTML() {
  showProgress(true);

  const zip = new JSZip();

  const jsonData = {
    questions: questions.map((q) => {
      const { imageData, ...question } = q;
      return question;
    }),
    exportDate: new Date().toISOString(),
  };

  zip.file("questions.json", JSON.stringify(jsonData, null, 2));

  const imagesFolder = zip.folder("images");
  questions.forEach((q) => {
    if (q.type === "image" && q.imageName && imageStore[q.imageName]) {
      const imageData = imageStore[q.imageName].split(",")[1];
      imagesFolder.file(q.imageName, imageData, { base64: true });
    }
  });

  const readme = `# Тестовый проект
Создан: ${new Date().toLocaleString()}
Всего вопросов: ${questions.length}
Всего баллов: ${questions.reduce((sum, q) => sum + (q.points || 1), 0)}

## Инструкция:
1. Откройте index.html в браузере
2. Загрузите файл questions.json
3. Проходите тестирование

## Структура:
- index.html - основной тест
- questions.json - файл с вопросами
- images/ - папка с изображениями
`;
  zip.file("README.txt", readme);

  const simpleHTML = `<!DOCTYPE html>
<html>
<head><title>Тест</title></head>
<body>
    <h1>Тестовый проект</h1>
    <p>Всего вопросов: ${questions.length}</p>
    <p>Для прохождения теста используйте основной файл index.html</p>
</body>
</html>`;
  zip.file("info.html", simpleHTML);

  zip.generateAsync({ type: "blob" }).then(function (content) {
    saveAs(
      content,
      `complete_quiz_${new Date().toISOString().slice(0, 10)}.zip`,
    );
    showProgress(false);
    closeModal("exportModal");
    showNotification("Полный проект сохранен", "success");
  });
}

function importQuestions() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json, application/json";

  input.onchange = function (e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function (event) {
      try {
        const imported = JSON.parse(event.target.result);

        if (Array.isArray(imported.questions)) {
          imported.questions.forEach((q) => {
            q.id = Date.now() + Math.random();
            questions.push(q);
          });
        } else if (Array.isArray(imported)) {
          imported.forEach((q) => {
            q.id = Date.now() + Math.random();
            questions.push(q);
          });
        }

        saveToStorage();
        updateQuestionsList();
        updateStats();
        showNotification("Вопросы импортированы", "success");
      } catch (error) {
        showNotification("Ошибка импорта JSON", "error");
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

function saveProject() {
  saveToStorage();
  showNotification("Проект сохранен в браузере", "success");
}

function showNotification(message, type = "info") {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.className = "notification " + type;
  notification.classList.add("show");

  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}

function showProgress(show) {
  const progressBar = document.getElementById("progressBar");
  const progressFill = document.getElementById("progressFill");

  if (show) {
    progressBar.style.display = "block";
    progressFill.style.width = "50%";
  } else {
    progressFill.style.width = "100%";
    setTimeout(() => {
      progressBar.style.display = "none";
      progressFill.style.width = "0%";
    }, 500);
  }
}
