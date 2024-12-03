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
        this.copyBtn = document.getElementById('copyBtn');
        this.rowsPerFileInput = document.getElementById('rowsPerFile');
        this.totalRowsSpan = document.getElementById('totalRows');
        this.outputFormatRadios = document.getElementsByName('outputFormat');
    }

    addEventListeners() {
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e));
        this.selectAllBtn.addEventListener('click', () => this.selectAll());
        this.deselectAllBtn.addEventListener('click', () => this.deselectAll());
        this.exportBtn.addEventListener('click', () => this.exportSelectedColumns());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
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

    getSelectedFormat() {
        return Array.from(this.outputFormatRadios).find(radio => radio.checked)?.value || 'csv';
    }

    getFilteredData(selectedColumns) {
        return this.data.map(row => {
            const filteredRow = {};
            selectedColumns.forEach(column => {
                filteredRow[column] = row[column];
            });
            return filteredRow;
        });
    }

    splitDataIntoChunks(data, rowsPerFile) {
        const chunks = [];
        for (let i = 0; i < data.length; i += rowsPerFile) {
            chunks.push(data.slice(i, i + rowsPerFile));
        }
        return chunks;
    }

    async copyToClipboard() {
        const selectedColumns = Array.from(this.columnsList.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);

        if (selectedColumns.length === 0) {
            alert('Please select at least one column to copy.');
            return;
        }

        const filteredData = this.getFilteredData(selectedColumns);
        const format = this.getSelectedFormat();
        let content;

        if (format === 'json') {
            content = JSON.stringify(filteredData, null, 2);
        } else {
            content = Papa.unparse(filteredData);
        }

        try {
            await navigator.clipboard.writeText(content);
            this.copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                this.copyBtn.textContent = 'Copy to Clipboard';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            alert('Failed to copy to clipboard. Please try again.');
        }
    }

    async exportSelectedColumns() {
        const selectedColumns = Array.from(this.columnsList.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);

        if (selectedColumns.length === 0) {
            alert('Please select at least one column to export.');
            return;
        }

        const filteredData = this.getFilteredData(selectedColumns);
        const format = this.getSelectedFormat();
        const rowsPerFile = parseInt(this.rowsPerFileInput.value) || filteredData.length;
        const zip = new JSZip();

        if (rowsPerFile >= filteredData.length) {
            // Single file export
            const filename = `export.${format}`;
            let content;

            if (format === 'json') {
                content = JSON.stringify(filteredData, null, 2);
            } else {
                content = Papa.unparse(filteredData);
            }

            const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            // Multiple files export
            const chunks = this.splitDataIntoChunks(filteredData, rowsPerFile);
            
            chunks.forEach((chunk, index) => {
                let content;
                if (format === 'json') {
                    content = JSON.stringify(chunk, null, 2);
                } else {
                    content = Papa.unparse(chunk);
                }
                zip.file(`export_${index + 1}.${format}`, content);
            });

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'exports.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
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
