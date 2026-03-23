
if (!window.location.hash) {
    window.location.hash = "#strona";
}

// --- 1. INICJALIZACJA DANYCH (localStorage) ---
let h_czas = JSON.parse(localStorage.getItem('h_czas')) || [];
let h_temp = JSON.parse(localStorage.getItem('h_temp')) || [];
let h_soil = JSON.parse(localStorage.getItem('h_soil')) || [];
let h_light = JSON.parse(localStorage.getItem('h_light')) || [];

const MAX_PUNKTOW = 20;

// --- 2. FUNKCJA TWORZĄCA WYKRES ---
function stworzWykres(idElementu, czasy, wartosci, tytul, kolor) {
    const data = [{
        x: czasy,
        y: wartosci,
        type: "scatter",
        mode: "lines+markers",
        line: {
            shape: 'spline',
            smoothing: 1.3,
            color: kolor,
            width: 3
        },
        marker: {
            size: 8,
            color: 'white',
            line: { color: kolor, width: 2 }
        }
    }];

    const layout = {
        title: tytul,
        xaxis: {
            title: "Czas",
            type: "category"
        },
        yaxis: {
            autorange: true
        },
        margin: { t: 40, b: 40, l: 50, r: 20 }
    };

    Plotly.newPlot(idElementu, data, layout, { responsive: true });
}

// --- 3. INICJALIZACJA WYKRESÓW ---
function inicjalizujWykresy() {
    stworzWykres("wykres_tem", h_czas, h_temp, "Temperatura", "#ff4d4d");
    stworzWykres("wykres_wil", h_czas, h_soil, "Wilgotność", "#4d94ff");
    stworzWykres("wykres_osw", h_czas, h_light, "Światło", "#ffcc00");
}

// --- 4. MQTT CONFIG ---
var client = new Paho.MQTT.Client(
    "broker.hivemq.com",
    8884,
    "/mqtt",
    "webClient_" + Math.floor(Math.random() * 1000)
);

client.onMessageArrived = onMessageArrived;

client.connect({
    useSSL: true,
    onSuccess: () => {
        console.log("Połączono!");
        client.subscribe("plant/data");
        inicjalizujWykresy();
    },
    onFailure: (err) => {
        console.error("Błąd:", err);
    }
});
// --- 5. ODBIÓR DANYCH ---
function onMessageArrived(message) {
    try {
        var data = JSON.parse(message.payloadString);
        var teraz = new Date().toLocaleTimeString();

        // Aktualizacja wartości na stronie
        if (document.getElementById("temp"))
            document.getElementById("temp").innerText = data.temperature + " °C";

        if (document.getElementById("wilg"))
            document.getElementById("wilg").innerText = data.soil + " ";

        if (document.getElementById("light"))
            document.getElementById("light").innerText = data.light + " lux";

        // --- DODAWANIE DO HISTORII ---
        h_czas.push(teraz);
        h_temp.push(data.temperature);
        h_soil.push(data.soil);
        h_light.push(data.light);

        // --- USUWANIE NAJSTARSZEGO (jeśli przekroczono limit) ---
        if (h_czas.length > MAX_PUNKTOW) {
            h_czas.shift();
            h_temp.shift();
            h_soil.shift();
            h_light.shift();
        }

        // --- ZAPIS DO localStorage ---
        localStorage.setItem('h_czas', JSON.stringify(h_czas));
        localStorage.setItem('h_temp', JSON.stringify(h_temp));
        localStorage.setItem('h_soil', JSON.stringify(h_soil));
        localStorage.setItem('h_light', JSON.stringify(h_light));

        // --- AKTUALIZACJA WYKRESÓW (przesuwanie okna danych) ---
        Plotly.extendTraces("wykres_tem", {
            x: [[teraz]],
            y: [[data.temperature]]
        }, [0], MAX_PUNKTOW);

        Plotly.extendTraces("wykres_wil", {
            x: [[teraz]],
            y: [[data.soil]]
        }, [0], MAX_PUNKTOW);

        Plotly.extendTraces("wykres_osw", {
            x: [[teraz]],
            y: [[data.light]]
        }, [0], MAX_PUNKTOW);

    } catch (e) {
        console.error("Błąd danych:", e);
    }
}
