class ChartManager {
    constructor() {
        this.chart = null;
    }

    createPieChart(stats) {
        const canvas = document.getElementById('scoreChart');
        if (!canvas) {
            console.error('Canvas не найден!');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        const labels = [];
        const data = [];
        const backgroundColors = [];
        const borderColors = [];
        
        if (stats.correctCount > 0) {
            labels.push('✅ Правильно');
            data.push(stats.correctCount);
            backgroundColors.push('rgba(40, 167, 69, 0.8)');
            borderColors.push('rgba(40, 167, 69, 1)');
        }
        
        if (stats.incorrectCount > 0) {
            labels.push('❌ Неправильно');
            data.push(stats.incorrectCount);
            backgroundColors.push('rgba(220, 53, 69, 0.8)');
            borderColors.push('rgba(220, 53, 69, 1)');
        }
        
        if (stats.noAnswerCount > 0) {
            labels.push('⏭️ Пропущено');
            data.push(stats.noAnswerCount);
            backgroundColors.push('rgba(255, 193, 7, 0.8)');
            borderColors.push('rgba(255, 193, 7, 1)');
        }
        
        if (stats.unansweredCount > 0) {
            labels.push('❓ Не пройдено');
            data.push(stats.unansweredCount);
            backgroundColors.push('rgba(108, 117, 125, 0.8)');
            borderColors.push('rgba(108, 117, 125, 1)');
        }

        if (data.length === 0) {
            labels.push('📋 Нет данных');
            data.push(1);
            backgroundColors.push('rgba(200, 200, 200, 0.8)');
            borderColors.push('rgba(200, 200, 200, 1)');
        }

        console.log('Создание диаграммы с данными:', { labels, data });

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 14 },
                            color: '#333'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }

    updateChart(stats) {
        console.log('Обновление диаграммы со статистикой:', stats);
        this.createPieChart(stats);
    }
}