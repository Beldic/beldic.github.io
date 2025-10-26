// Configuración de la simulación
const CONFIG = {
    NUM_AGENTS: 10,
    INITIAL_VALUE: 100,
    GROWTH_RATE: 0.08, // 8% crecimiento para a1 (capitalista acumulador)
    REDISTRIBUTION_RATE: 0.15, // 15% de lo generado por a1 se redistribuye entre los demás (salarios, impuestos, etc.)
    CHART_SIZE: 400
};

// Colores para los agentes
const COLORS = [
    '#e74c3c', // a1 - Rojo (capitalista)
    '#3498db',
    '#2ecc71',
    '#f39c12',
    '#9b59b6',
    '#1abc9c',
    '#34495e',
    '#e67e22',
    '#95a5a6',
    '#16a085'
];

// Formatear números al estilo español (coma para decimales)
function formatNumber(num, decimals = 2) {
    return num.toFixed(decimals).replace('.', ',');
}

// Estado de la simulación
let simulation = {
    state: 0,
    agents: [],
    previousAgents: [],
    autoPlayInterval: null,
    autoPlaySpeed: 500
};

// Inicializar la simulación
function initSimulation() {
    simulation.state = 0;
    simulation.agents = [];

    for (let i = 0; i < CONFIG.NUM_AGENTS; i++) {
        simulation.agents.push({
            id: i,
            name: `a${i + 1}`,
            nominalValue: CONFIG.INITIAL_VALUE,
            percentage: 10.0,
            color: COLORS[i]
        });
    }

    simulation.previousAgents = JSON.parse(JSON.stringify(simulation.agents));
    updateUI();
}

// Ejecutar una iteración de la simulación
function stepSimulation() {
    simulation.previousAgents = JSON.parse(JSON.stringify(simulation.agents));
    simulation.state++;

    // Calcular el valor anterior de a1
    const a1PreviousValue = simulation.agents[0].nominalValue;

    // a1 (agente 0) crece un 8% (capitalista acumulador)
    simulation.agents[0].nominalValue *= (1 + CONFIG.GROWTH_RATE);

    // Calcular cuánto generó a1 en esta iteración
    const a1Growth = simulation.agents[0].nominalValue - a1PreviousValue;

    // Calcular cuánto se redistribuye del crecimiento de a1
    const redistributedWealth = a1Growth * CONFIG.REDISTRIBUTION_RATE;

    // Dividir la riqueza redistribuida entre los demás 9 agentes
    const wealthPerAgent = redistributedWealth / (CONFIG.NUM_AGENTS - 1);

    // Los demás agentes reciben su parte de la redistribución
    // (salarios, subvenciones, impuestos redistribuidos, etc.)
    for (let i = 1; i < simulation.agents.length; i++) {
        simulation.agents[i].nominalValue += wealthPerAgent;
    }

    // Recalcular el total y los porcentajes
    const total = simulation.agents.reduce((sum, agent) => sum + agent.nominalValue, 0);

    simulation.agents.forEach(agent => {
        agent.percentage = (agent.nominalValue / total) * 100;
    });

    updateUI();
}

// Ejecutar múltiples iteraciones
function stepMultiple(n) {
    for (let i = 0; i < n; i++) {
        stepSimulation();
    }
}

// Actualizar la interfaz
function updateUI() {
    updateMetrics();
    updateTable();
    drawPieChart();
    updateInsight();
}

// Actualizar métricas
function updateMetrics() {
    const total = simulation.agents.reduce((sum, agent) => sum + agent.nominalValue, 0);
    const a1Concentration = simulation.agents[0].percentage;
    const gini = calculateGini();

    document.getElementById('currentState').textContent = `e${simulation.state}`;
    document.getElementById('totalEconomy').textContent = formatNumber(total, 2);
    document.getElementById('a1Concentration').textContent = `${formatNumber(a1Concentration, 2)}%`;
    document.getElementById('giniIndex').textContent = formatNumber(gini, 3);

    // Animación de actualización
    document.querySelectorAll('.metric-card').forEach(card => {
        card.classList.add('updated');
        setTimeout(() => card.classList.remove('updated'), 500);
    });
}

// Actualizar tabla
function updateTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    simulation.agents.forEach((agent, index) => {
        const prevAgent = simulation.previousAgents[index];
        const nominalDelta = agent.nominalValue - prevAgent.nominalValue;
        const percentageDelta = agent.percentage - prevAgent.percentage;

        const row = document.createElement('tr');
        if (agent.name === 'a1') {
            row.classList.add('agent-a1');
        }

        row.innerHTML = `
            <td>
                <div class="agent-name">
                    <span class="agent-color" style="background-color: ${agent.color}"></span>
                    ${agent.name}
                </div>
            </td>
            <td>${formatNumber(agent.nominalValue, 2)}</td>
            <td>${formatNumber(agent.percentage, 2)}%</td>
            <td class="${getDeltaClass(nominalDelta)}">
                ${nominalDelta >= 0 ? '+' : ''}${formatNumber(nominalDelta, 2)}
            </td>
            <td class="${getDeltaClass(percentageDelta)}">
                ${percentageDelta >= 0 ? '+' : ''}${formatNumber(percentageDelta, 3)}%
            </td>
        `;

        tbody.appendChild(row);
    });
}

// Obtener clase CSS para delta
function getDeltaClass(delta) {
    if (delta > 0.001) return 'value-positive';
    if (delta < -0.001) return 'value-negative';
    return 'value-neutral';
}

// Dibujar gráfico de tarta
function drawPieChart() {
    const canvas = document.getElementById('pieChart');
    const ctx = canvas.getContext('2d');

    // Configurar tamaño del canvas
    const size = CONFIG.CHART_SIZE;
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35;

    // Limpiar canvas
    ctx.clearRect(0, 0, size, size);

    // Dibujar el gráfico de tarta
    let currentAngle = -Math.PI / 2; // Empezar desde arriba

    simulation.agents.forEach(agent => {
        const sliceAngle = (agent.percentage / 100) * 2 * Math.PI;

        // Dibujar porción
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = agent.color;
        ctx.fill();

        // Borde blanco
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Etiqueta si la porción es suficientemente grande
        if (agent.percentage > 2) {
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelRadius = radius * 0.7;
            const labelX = centerX + Math.cos(labelAngle) * labelRadius;
            const labelY = centerY + Math.sin(labelAngle) * labelRadius;

            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Sombra para mejor legibilidad
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;

            ctx.fillText(agent.name, labelX, labelY);
            ctx.fillText(`${formatNumber(agent.percentage, 1)}%`, labelX, labelY + 18);

            // Resetear sombra
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        currentAngle += sliceAngle;
    });

    // Dibujar círculo central para efecto donut
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();

    // Texto en el centro
    ctx.fillStyle = '#667eea';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`e${simulation.state}`, centerX, centerY - 15);

    ctx.font = '16px Arial';
    ctx.fillStyle = '#666';
    const total = simulation.agents.reduce((sum, agent) => sum + agent.nominalValue, 0);
    ctx.fillText(`${Math.round(total)}`, centerX, centerY + 10);
}

// Calcular índice de Gini
function calculateGini() {
    const values = simulation.agents.map(a => a.nominalValue);
    const n = values.length;
    const mean = values.reduce((sum, v) => sum + v, 0) / n;

    let sumDiff = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            sumDiff += Math.abs(values[i] - values[j]);
        }
    }

    return sumDiff / (2 * n * n * mean);
}

// Actualizar texto de insight
function updateInsight() {
    const a1Percent = simulation.agents[0].percentage;
    const avgOthers = simulation.agents.slice(1).reduce((sum, a) => sum + a.percentage, 0) / 9;
    const redistPercent = Math.round(CONFIG.REDISTRIBUTION_RATE * 100);
    const retentionPercent = 100 - redistPercent;

    let insight = '';

    if (simulation.state === 0) {
        insight = 'En el estado inicial (e0), todos los agentes tienen el mismo valor nominal y porcentaje de la economía (10%).';
    } else if (simulation.state < 5) {
        insight = `A1 ya controla ${formatNumber(a1Percent, 1)}% de la economía. Los demás (${formatNumber(avgOthers, 2)}% cada uno) crecen nominalmente gracias a la redistribución de lo que genera a1, pero ya pierden porcentaje real.`;
    } else if (simulation.state < 20) {
        insight = `Aunque los valores nominales de todos aumentan, el poder adquisitivo real (%) de los no-acumuladores disminuye. Solo reciben el ${redistPercent}% de lo que a1 genera, mientras a1 retiene el ${retentionPercent}%.`;
    } else if (simulation.state < 50) {
        insight = `La concentración se acelera: a1 controla ${formatNumber(a1Percent, 1)}% mientras los demás tienen ${formatNumber(avgOthers, 2)}% promedio. Dependen totalmente de la redistribución que hace a1.`;
    } else {
        insight = `A1 domina con ${formatNumber(a1Percent, 1)}% del total. Los demás son económicamente marginales, sobreviviendo solo de la redistribución de las migajas del crecimiento de a1.`;
    }

    document.getElementById('insightText').textContent = insight;
}

// Controles
document.getElementById('stepBtn').addEventListener('click', () => {
    stepSimulation();
});

document.getElementById('step10Btn').addEventListener('click', () => {
    stepMultiple(10);
});

document.getElementById('resetBtn').addEventListener('click', () => {
    if (simulation.autoPlayInterval) {
        clearInterval(simulation.autoPlayInterval);
        simulation.autoPlayInterval = null;
        document.getElementById('autoPlayBtn').textContent = '⏯ Auto-Play';
    }
    initSimulation();
});

document.getElementById('autoPlayBtn').addEventListener('click', (e) => {
    if (simulation.autoPlayInterval) {
        // Detener auto-play
        clearInterval(simulation.autoPlayInterval);
        simulation.autoPlayInterval = null;
        e.target.innerHTML = '<span>⏯</span> Auto-Play';
    } else {
        // Iniciar auto-play
        simulation.autoPlayInterval = setInterval(() => {
            stepSimulation();
        }, simulation.autoPlaySpeed);
        e.target.innerHTML = '<span>⏸</span> Pausar';
    }
});

document.getElementById('speedSlider').addEventListener('input', (e) => {
    const speed = parseInt(e.target.value);
    simulation.autoPlaySpeed = speed;
    document.getElementById('speedValue').textContent = `${speed}ms`;

    // Si está en auto-play, reiniciar con la nueva velocidad
    if (simulation.autoPlayInterval) {
        clearInterval(simulation.autoPlayInterval);
        simulation.autoPlayInterval = setInterval(() => {
            stepSimulation();
        }, simulation.autoPlaySpeed);
    }
});

document.getElementById('redistributionSlider').addEventListener('input', (e) => {
    const redistribution = parseInt(e.target.value);
    CONFIG.REDISTRIBUTION_RATE = redistribution / 100; // Convertir de porcentaje a decimal
    document.getElementById('redistributionValue').textContent = `${redistribution}%`;
    document.getElementById('redistributionInfo').textContent = `${redistribution}%`;
});

// Inicializar al cargar la página
window.addEventListener('load', () => {
    initSimulation();
});

// Manejar redimensionamiento de ventana
window.addEventListener('resize', () => {
    drawPieChart();
});
