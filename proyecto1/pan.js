// Configuración de la simulación
const CONFIG = {
    NUM_AGENTS: 10,
    INITIAL_VALUE: 100,
    GROWTH_RATE: 0.08, // 8% crecimiento para a1 (capitalista acumulador)
    REDISTRIBUTION_RATE: 0.15, // 15% de lo generado por a1 se redistribuye
    BREAD_FRACTION: 0.001, // 0.1% de la economía = precio de una barra de pan
    CHART_WIDTH: 800,
    CHART_HEIGHT: 400,
    MAX_HISTORY: 50 // Máximo de estados a mostrar en el gráfico
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
    history: [], // Historial para el gráfico de líneas
    autoPlayInterval: null,
    autoPlaySpeed: 500,
    baseBreadPrice: 0, // Precio del pan en e0
    baseBreadsAffordable: 0 // Panes comprables en e0 (promedio no-acumuladores)
};

// Inicializar la simulación
function initSimulation() {
    simulation.state = 0;
    simulation.agents = [];
    simulation.history = [];

    for (let i = 0; i < CONFIG.NUM_AGENTS; i++) {
        simulation.agents.push({
            id: i,
            name: `a${i + 1}`,
            nominalValue: CONFIG.INITIAL_VALUE,
            percentage: 10.0,
            breadAffordable: 0,
            color: COLORS[i]
        });
    }

    // Calcular panes iniciales
    calculateBreadAffordability();

    // Guardar valores base (e0)
    const total = simulation.agents.reduce((sum, agent) => sum + agent.nominalValue, 0);
    simulation.baseBreadPrice = total * CONFIG.BREAD_FRACTION;
    const nonAccumulatorBreads = simulation.agents.slice(1).reduce((sum, a) => sum + a.breadAffordable, 0) / 9;
    simulation.baseBreadsAffordable = nonAccumulatorBreads;

    // Guardar estado inicial en el historial
    saveToHistory();

    simulation.previousAgents = JSON.parse(JSON.stringify(simulation.agents));
    updateUI();
}

// Calcular cuántos panes puede comprar cada agente
function calculateBreadAffordability() {
    const total = simulation.agents.reduce((sum, agent) => sum + agent.nominalValue, 0);
    const breadPrice = total * CONFIG.BREAD_FRACTION;

    simulation.agents.forEach(agent => {
        agent.breadAffordable = agent.nominalValue / breadPrice;
        agent.percentage = (agent.nominalValue / total) * 100;
    });

    return breadPrice;
}

// Guardar estado actual en el historial
function saveToHistory() {
    const snapshot = simulation.agents.map(agent => ({
        state: simulation.state,
        name: agent.name,
        breadAffordable: agent.breadAffordable
    }));

    simulation.history.push(snapshot);

    // Limitar el historial al máximo configurado
    if (simulation.history.length > CONFIG.MAX_HISTORY) {
        simulation.history.shift();
    }
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
    for (let i = 1; i < simulation.agents.length; i++) {
        simulation.agents[i].nominalValue += wealthPerAgent;
    }

    // Calcular el precio del pan y cuántos panes puede comprar cada agente
    calculateBreadAffordability();

    // Guardar en el historial
    saveToHistory();

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
    drawLineChart();
    updateInsight();
}

// Actualizar métricas
function updateMetrics() {
    const total = simulation.agents.reduce((sum, agent) => sum + agent.nominalValue, 0);
    const breadPrice = total * CONFIG.BREAD_FRACTION;

    // Calcular promedio de panes comprables por los no-acumuladores
    const nonAccumulatorBreads = simulation.agents.slice(1).reduce((sum, a) => sum + a.breadAffordable, 0) / 9;

    // Actualizar métricas básicas
    document.getElementById('currentState').textContent = `e${simulation.state}`;
    document.getElementById('totalEconomy').textContent = formatNumber(total, 2);

    // Actualizar comparaciones de precio del pan
    document.getElementById('baseBreadPrice').textContent = formatNumber(simulation.baseBreadPrice, 3);
    document.getElementById('currentBreadPrice').textContent = formatNumber(breadPrice, 3);

    const priceChange = ((breadPrice / simulation.baseBreadPrice - 1) * 100);
    const priceChangeEl = document.getElementById('breadPriceChange');
    priceChangeEl.textContent = `${priceChange >= 0 ? '+' : ''}${formatNumber(priceChange, 1)}%`;
    priceChangeEl.className = 'comparison-value ' + (priceChange > 0 ? 'negative' : 'neutral');

    // Actualizar comparaciones de panes comprables
    document.getElementById('baseBreadsAffordable').textContent = formatNumber(simulation.baseBreadsAffordable, 1);
    document.getElementById('currentBreadsAffordable').textContent = formatNumber(nonAccumulatorBreads, 1);

    const breadsChange = ((nonAccumulatorBreads / simulation.baseBreadsAffordable - 1) * 100);
    const breadsChangeEl = document.getElementById('breadsChange');
    breadsChangeEl.textContent = `${breadsChange >= 0 ? '+' : ''}${formatNumber(breadsChange, 1)}%`;
    breadsChangeEl.className = 'comparison-value ' + (breadsChange >= 0 ? 'positive' : 'negative');
}

// Actualizar tabla
function updateTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    simulation.agents.forEach((agent, index) => {
        const prevAgent = simulation.previousAgents[index];
        const breadDelta = agent.breadAffordable - prevAgent.breadAffordable;

        const row = document.createElement('tr');
        if (agent.name === 'a1') {
            row.classList.add('agent-a1');
        }

        // Visual de panes (iconos)
        const breadCount = Math.round(agent.breadAffordable);
        const maxIcons = 10;
        const iconsToShow = Math.min(breadCount, maxIcons);
        const breadIcons = '🍞'.repeat(iconsToShow) + (breadCount > maxIcons ? `... (${breadCount})` : '');

        row.innerHTML = `
            <td>
                <div class="agent-name">
                    <span class="agent-color" style="background-color: ${agent.color}"></span>
                    ${agent.name}
                </div>
            </td>
            <td>${formatNumber(agent.nominalValue, 2)}</td>
            <td><strong>${formatNumber(agent.breadAffordable, 1)}</strong></td>
            <td class="${getDeltaClass(breadDelta)}">
                ${breadDelta >= 0 ? '+' : ''}${formatNumber(breadDelta, 1)}
            </td>
            <td class="bread-visual">${breadIcons}</td>
        `;

        tbody.appendChild(row);
    });
}

// Obtener clase CSS para delta
function getDeltaClass(delta) {
    if (delta > 0.01) return 'value-positive';
    if (delta < -0.01) return 'value-negative';
    return 'value-neutral';
}

// Dibujar gráfico de líneas
function drawLineChart() {
    const canvas = document.getElementById('lineChart');
    const ctx = canvas.getContext('2d');

    // Configurar tamaño del canvas
    canvas.width = CONFIG.CHART_WIDTH;
    canvas.height = CONFIG.CHART_HEIGHT;

    const padding = 60;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (simulation.history.length < 2) {
        // Mensaje inicial
        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Avanza la simulación para ver la evolución...', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Encontrar valores máximos y mínimos
    let maxBread = 0;
    let minBread = Infinity;

    simulation.history.forEach(snapshot => {
        snapshot.forEach(agentData => {
            maxBread = Math.max(maxBread, agentData.breadAffordable);
            minBread = Math.min(minBread, agentData.breadAffordable);
        });
    });

    // Añadir margen al rango
    maxBread *= 1.1;
    minBread = Math.max(0, minBread * 0.9);

    const breadRange = maxBread - minBread;

    // Dibujar ejes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;

    // Eje Y
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();

    // Eje X
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Etiquetas eje Y
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 5; i++) {
        const value = minBread + (breadRange * i / 5);
        const y = canvas.height - padding - (chartHeight * i / 5);
        ctx.fillText(Math.round(value), padding - 10, y);

        // Líneas de guía
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }

    // Etiquetas eje X
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const numStates = simulation.history.length;
    const step = Math.max(1, Math.floor(numStates / 10));

    for (let i = 0; i < numStates; i += step) {
        const x = padding + (chartWidth * i / (numStates - 1));
        const state = simulation.history[i][0].state;
        ctx.fillText(`e${state}`, x, canvas.height - padding + 10);
    }

    // Etiqueta del eje Y
    ctx.save();
    ctx.translate(20, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#667eea';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Panes Comprables', 0, 0);
    ctx.restore();

    // Etiqueta del eje X
    ctx.fillStyle = '#667eea';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Estado de la Economía', canvas.width / 2, canvas.height - 20);

    // Dibujar líneas para cada agente
    for (let agentId = 0; agentId < CONFIG.NUM_AGENTS; agentId++) {
        ctx.strokeStyle = COLORS[agentId];
        ctx.lineWidth = agentId === 0 ? 3 : 2; // a1 más grueso
        ctx.beginPath();

        simulation.history.forEach((snapshot, index) => {
            const agentData = snapshot[agentId];
            const x = padding + (chartWidth * index / (numStates - 1));
            const y = canvas.height - padding - ((agentData.breadAffordable - minBread) / breadRange * chartHeight);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Punto final
        const lastSnapshot = simulation.history[simulation.history.length - 1];
        const lastAgentData = lastSnapshot[agentId];
        const lastX = padding + chartWidth;
        const lastY = canvas.height - padding - ((lastAgentData.breadAffordable - minBread) / breadRange * chartHeight);

        ctx.fillStyle = COLORS[agentId];
        ctx.beginPath();
        ctx.arc(lastX, lastY, agentId === 0 ? 5 : 3, 0, 2 * Math.PI);
        ctx.fill();

        // Etiqueta del agente
        ctx.fillStyle = COLORS[agentId];
        ctx.font = agentId === 0 ? 'bold 12px Arial' : '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`a${agentId + 1}`, lastX + 10, lastY);
    }
}

// Actualizar texto de insight
function updateInsight() {
    const a1Bread = simulation.agents[0].breadAffordable;
    const avgOthersBread = simulation.agents.slice(1).reduce((sum, a) => sum + a.breadAffordable, 0) / 9;
    const redistPercent = Math.round(CONFIG.REDISTRIBUTION_RATE * 100);

    let insight = '';

    if (simulation.state === 0) {
        insight = 'En el estado inicial (e0), todos pueden comprar la misma cantidad de pan (100 barras).';
    } else if (simulation.state < 5) {
        insight = `A1 puede comprar ${Math.round(a1Bread)} panes, mientras los demás pueden comprar ${Math.round(avgOthersBread)} panes en promedio. La divergencia ya comenzó.`;
    } else if (simulation.state < 20) {
        const a1Change = Math.round((a1Bread / 100 - 1) * 100);
        const othersChange = Math.round((avgOthersBread / 100 - 1) * 100);
        insight = `A1 puede comprar ${a1Change > 0 ? '+' : ''}${a1Change}% más pan que inicialmente. Los demás pueden comprar ${othersChange}% ${othersChange >= 0 ? 'más' : 'menos'}. Aunque todos tienen más dinero, solo a1 mejora su poder adquisitivo.`;
    } else if (simulation.state < 50) {
        insight = `La brecha es dramática: a1 compra ${Math.round(a1Bread)} panes mientras los demás solo ${Math.round(avgOthersBread)}. El dinero miente, el pan dice la verdad.`;
    } else {
        insight = `A1 puede comprar ${Math.round(a1Bread)} panes, los demás solo ${Math.round(avgOthersBread)}. La desigualdad medida en bienes reales es incontestable.`;
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
        document.getElementById('autoPlayBtn').innerHTML = '<span>⏯</span> Auto-Play';
    }
    initSimulation();
});

document.getElementById('autoPlayBtn').addEventListener('click', (e) => {
    if (simulation.autoPlayInterval) {
        clearInterval(simulation.autoPlayInterval);
        simulation.autoPlayInterval = null;
        e.target.innerHTML = '<span>⏯</span> Auto-Play';
    } else {
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

    if (simulation.autoPlayInterval) {
        clearInterval(simulation.autoPlayInterval);
        simulation.autoPlayInterval = setInterval(() => {
            stepSimulation();
        }, simulation.autoPlaySpeed);
    }
});

document.getElementById('redistributionSlider').addEventListener('input', (e) => {
    const redistribution = parseInt(e.target.value);
    CONFIG.REDISTRIBUTION_RATE = redistribution / 100;
    document.getElementById('redistributionValue').textContent = `${redistribution}%`;
    document.getElementById('redistributionInfo').textContent = `${redistribution}%`;
});

document.getElementById('breadFractionSlider').addEventListener('input', (e) => {
    const fraction = parseFloat(e.target.value);
    CONFIG.BREAD_FRACTION = fraction / 1000; // Convertir de 0.5-2 a 0.0005-0.002
    const percentage = formatNumber(CONFIG.BREAD_FRACTION * 100, 3);
    document.getElementById('breadFractionValue').textContent = `${percentage}%`;
    document.getElementById('breadFractionInfo').textContent = `${percentage}%`;

    // Recalcular con la nueva fracción
    if (simulation.state > 0) {
        calculateBreadAffordability();
        updateUI();
    }
});

// Inicializar al cargar la página
window.addEventListener('load', () => {
    initSimulation();
});

// Manejar redimensionamiento de ventana
window.addEventListener('resize', () => {
    drawLineChart();
});
