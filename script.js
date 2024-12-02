class CSVColumnSplitter {
    constructor() {
        this.csvFile = null;
        this.columns = [];
        this.data = [];
        this.initializeElements();
        this.addEventListeners();
    }

    initializeElements() {
        this.fileInput = document.getElementById('csvFile');
        this.searchInput = document.getElementById('searchInput');
        this.columnsList = document.getElementById('columnsList');
        this.selectAllBtn = document.getElementById('selectAll');
        this.deselectAllBtn = document.getElementById('deselectAll');
        this.exportBtn = document.getElementById('exportBtn');
        this.rowsPerFileInput = document.getElementById('rowsPerFile');
        this.totalRowsSpan = document.getElementById('totalRows');
    }

    addEventListeners() {
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e));
        this.selectAllBtn.addEventListener('click', () => this.selectAll());
        this.deselectAllBtn.addEventListener('click', () => this.deselectAll());
        this.exportBtn.addEventListener('click', () => this.exportSelectedColumns());
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            Papa.parse(file, {
                complete: (results) => {
                    this.handleParsedData(results);
                },
                header: true,
                encoding: 'UTF-8'
            });
        }
    }

    handleParsedData(results) {
        this.data = results.data;
        this.columns = Object.keys(results.data[0]).sort((a, b) => 
            a.toLowerCase().localeCompare(b.toLowerCase())
        );
        this.displayColumns();
        this.updateTotalRows();
    }

    updateTotalRows() {
        const totalRows = this.data.length;
        this.totalRowsSpan.textContent = `(Total rows: ${totalRows})`;
        this.rowsPerFileInput.placeholder = `All rows (${totalRows})`;
    }

    displayColumns() {
        this.columnsList.innerHTML = '';
        this.columns.forEach(column => {
            const div = document.createElement('div');
            div.className = 'column-checkbox';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `col-${column}`;
            checkbox.value = column;
            
            const label = document.createElement('label');
            label.htmlFor = `col-${column}`;
            label.textContent = column;
            
            div.appendChild(checkbox);
            div.appendChild(label);
            this.columnsList.appendChild(div);
        });
    }

    handleSearch(event) {
        const searchText = event.target.value.toLowerCase();
        const checkboxDivs = this.columnsList.getElementsByClassName('column-checkbox');
        
        Array.from(checkboxDivs).forEach(div => {
            const label = div.querySelector('label');
            const matches = label.textContent.toLowerCase().includes(searchText);
            div.classList.toggle('hidden', !matches);
        });
    }

    selectAll() {
        const checkboxes = this.columnsList.querySelectorAll('input[type="checkbox"]:not(.hidden)');
        checkboxes.forEach(checkbox => checkbox.checked = true);
    }

    deselectAll() {
        const checkboxes = this.columnsList.querySelectorAll('input[type="checkbox"]:not(.hidden)');
        checkboxes.forEach(checkbox => checkbox.checked = false);
    }

    async exportSelectedColumns() {
        const selectedColumns = Array.from(this.columnsList.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);

        if (selectedColumns.length === 0) {
            alert('Please select at least one column to export.');
            return;
        }

        const filteredData = this.data.map(row => {
            const newRow = {};
            selectedColumns.forEach(column => {
                newRow[column] = row[column];
            });
            return newRow;
        });

        const rowsPerFile = parseInt(this.rowsPerFileInput.value) || filteredData.length;
        const numberOfFiles = Math.ceil(filteredData.length / rowsPerFile);

        if (numberOfFiles === 1) {
            // Export as a single file
            this.downloadSingleFile(filteredData);
        } else {
            // Export as multiple files in a ZIP
            await this.downloadMultipleFiles(filteredData, rowsPerFile, numberOfFiles);
        }
    }

    downloadSingleFile(data) {
        const csv = Papa.unparse(data, {
            quotes: true,
            encoding: 'UTF-8'
        });

        const csvContent = '\ufeff' + csv; // Add BOM for UTF-8
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'selected_columns.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async downloadMultipleFiles(data, rowsPerFile, numberOfFiles) {
        const zip = new JSZip();
        const originalFileName = this.fileInput.files[0].name.replace('.csv', '');

        // Create each file and add to zip
        for (let i = 0; i < numberOfFiles; i++) {
            const start = i * rowsPerFile;
            const end = Math.min(start + rowsPerFile, data.length);
            const fileData = data.slice(start, end);

            const csv = Papa.unparse(fileData, {
                quotes: true,
                encoding: 'UTF-8'
            });

            const csvContent = '\ufeff' + csv; // Add BOM for UTF-8
            const fileName = `${originalFileName}_part${i + 1}.csv`;
            zip.file(fileName, csvContent);
        }

        // Generate and download the zip file
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${originalFileName}_split.zip`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new CSVColumnSplitter();
});
