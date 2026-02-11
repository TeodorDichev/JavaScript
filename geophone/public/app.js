function showSection(sectionId) {
    document.querySelectorAll('main section').forEach(s => s.style.display = 'none');
    document.getElementById(`${sectionId}-section`).style.display = 'block';

    if (sectionId === 'chart') loadChart();
    if (sectionId === 'table') loadTable();
}

async function uploadFile(type) {
    const fileInput = document.getElementById(`${type}-file`);
    const file = fileInput.files[0];

    if (!file) {
        alert('Моля, изберете файл първо!');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`/api/${type}/upload`, {
            method: 'POST',
            body: file 
        });

        const result = await response.json();
        if (result.success) {
            alert(result.message);
            fileInput.value = '';
        } else {
            alert('Грешка: ' + result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Възникна грешка при качването.');
    }
}

async function loadTable() {
    try {
        const response = await fetch('/api/index');
        const data = await response.json();
        
        const tbody = document.querySelector('#data-table tbody');
        tbody.innerHTML = '';

        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.phone_number || row.phone || ''}</td>
                <td>${row.phone_code || ''}</td>
                <td>${row.country_name || row.country || 'Неизвестна'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Грешка при зареждане на таблицата:', err);
    }
}

let myChart = null;

async function loadChart() {
    try {
        const response = await fetch('/api/chart');
        const data = await response.json();

        const labels = data.map(item => item.country_name);
        const counts = data.map(item => parseInt(item.count));

        const ctx = document.getElementById('myChart').getContext('2d');
        
        if (window.myChart instanceof Chart) {
            window.myChart.destroy();
        }

        window.myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Брой номера по държави',
                    data: counts,
                    backgroundColor: '#36a2eb80',
                    borderColor: '#36a2eb',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    } catch (err) {
        console.error('Грешка:', err);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    showSection('upload');
});