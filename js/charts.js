class ChartManager {
  constructor() {
    this.chart = null;
  }

  createPieChart(correct, incorrect) {
    const ctx = document.getElementById("scoreChart").getContext("2d");

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Правильно", "Неправильно"],
        datasets: [
          {
            data: [correct, incorrect],
            backgroundColor: [
              "rgba(40, 167, 69, 0.8)",
              "rgba(220, 53, 69, 0.8)",
            ],
            borderColor: ["rgba(40, 167, 69, 1)", "rgba(220, 53, 69, 1)"],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: {
                size: 14,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage =
                  total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
        cutout: "70%",
      },
    });
  }

  updateChart(correct, incorrect) {
    if (this.chart) {
      this.chart.data.datasets[0].data = [correct, incorrect];
      this.chart.update();
    } else {
      this.createPieChart(correct, incorrect);
    }
  }
}
