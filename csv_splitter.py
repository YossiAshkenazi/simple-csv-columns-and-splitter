import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import csv
import os
import codecs
from tkinter.font import Font

class CSVSplitterApp:
    def __init__(self, root):
        self.root = root
        self.root.title("CSV Column Splitter")
        self.root.geometry("500x600")
        
        # Configure style
        style = ttk.Style()
        style.configure('Header.TLabel', font=('Segoe UI', 11, 'bold'))
        style.configure('TButton', font=('Segoe UI', 10))
        style.configure('TCheckbutton', font=('Segoe UI', 10))
        
        # Main container with padding
        main_container = ttk.Frame(root, padding="10")
        main_container.pack(fill=tk.BOTH, expand=True)
        
        # File selection frame
        file_frame = ttk.Frame(main_container)
        file_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(file_frame, text="CSV File:", style='Header.TLabel').pack(side=tk.LEFT, padx=(0, 5))
        self.file_path_var = tk.StringVar()
        path_entry = ttk.Entry(file_frame, textvariable=self.file_path_var, width=50)
        path_entry.pack(side=tk.LEFT, padx=(0, 5), fill=tk.X, expand=True)
        browse_btn = ttk.Button(file_frame, text="Browse", command=self.browse_file, width=10)
        browse_btn.pack(side=tk.LEFT)
        
        # Columns selection frame
        columns_frame = ttk.LabelFrame(main_container, text="Select Columns", padding="10")
        columns_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Search frame
        search_frame = ttk.Frame(columns_frame)
        search_frame.pack(fill=tk.X, pady=(0, 5))
        
        ttk.Label(search_frame, text="Search:", style='Header.TLabel').pack(side=tk.LEFT, padx=(0, 5))
        self.search_var = tk.StringVar()
        self.search_var.trace('w', self.filter_columns)
        search_entry = ttk.Entry(search_frame, textvariable=self.search_var)
        search_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Buttons frame
        buttons_frame = ttk.Frame(columns_frame)
        buttons_frame.pack(fill=tk.X, pady=(5, 10))
        
        ttk.Button(buttons_frame, text="Select All", command=self.select_all, width=15).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(buttons_frame, text="Deselect All", command=self.deselect_all, width=15).pack(side=tk.LEFT)
        
        # Create canvas and scrollbar for scrolling
        canvas = tk.Canvas(columns_frame)
        scrollbar = ttk.Scrollbar(columns_frame, orient="vertical", command=canvas.yview)
        self.columns_container = ttk.Frame(canvas)
        
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Pack scrolling components
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Create window in canvas for checkboxes
        canvas_frame = canvas.create_window((0, 0), window=self.columns_container, anchor="nw")
        
        # Configure canvas scrolling
        def configure_scroll_region(event):
            canvas.configure(scrollregion=canvas.bbox("all"))
        
        def configure_canvas_width(event):
            canvas.itemconfig(canvas_frame, width=event.width)
        
        self.columns_container.bind('<Configure>', configure_scroll_region)
        canvas.bind('<Configure>', configure_canvas_width)
        
        # Enable mousewheel scrolling
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        
        canvas.bind_all("<MouseWheel>", on_mousewheel)
        
        # Export button with modern styling
        export_btn = ttk.Button(main_container, text="Export Selected Columns", 
                              command=self.export_columns, style='TButton')
        export_btn.pack(pady=(0, 10), ipadx=10, ipady=5)
        
        self.csv_file = None
        self.columns = []
        self.column_vars = {}  # Changed to dictionary to maintain column-checkbox mapping
        self.checkbuttons = {}  # Store checkbutton widgets
        
    def filter_columns(self, *args):
        search_text = self.search_var.get().lower()
        
        # Hide/show checkbuttons based on search
        for col, cb in self.checkbuttons.items():
            if search_text in col.lower():
                cb.pack(anchor=tk.W, pady=2)
            else:
                cb.pack_forget()
                
    def detect_encoding(self, file_path):
        encodings = ['utf-8', 'utf-8-sig', 'cp1252', 'iso-8859-1', 'ascii']
        for encoding in encodings:
            try:
                with codecs.open(file_path, 'r', encoding=encoding) as f:
                    f.read()
                return encoding
            except UnicodeDecodeError:
                continue
        return 'utf-8'  # default to utf-8 if no encoding works
        
    def load_csv_file(self, filename, encoding):
        try:
            with codecs.open(filename, 'r', encoding=encoding) as f:
                reader = csv.reader(f)
                self.columns = next(reader)
            
            self.csv_file = filename
            self.file_path_var.set(filename)
            
            # Clear existing checkboxes
            for widget in self.columns_container.winfo_children():
                widget.destroy()
            
            # Clear search
            self.search_var.set("")
            
            # Sort columns alphabetically
            sorted_columns = sorted(self.columns, key=str.lower)
            
            # Create new checkboxes
            self.column_vars = {}
            self.checkbuttons = {}
            
            for col in sorted_columns:
                var = tk.BooleanVar(value=False)
                self.column_vars[col] = var
                cb = ttk.Checkbutton(self.columns_container, text=col, variable=var)
                cb.pack(anchor=tk.W, pady=2)
                self.checkbuttons[col] = cb
                
        except Exception as e:
            messagebox.showerror("Error", f"Error reading CSV file: {str(e)}")
            return False
        return True
        
    def browse_file(self):
        filename = filedialog.askopenfilename(
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")])
        if filename:
            encoding = self.detect_encoding(filename)
            self.load_csv_file(filename, encoding)
    
    def select_all(self):
        for var in self.column_vars.values():
            var.set(True)
    
    def deselect_all(self):
        for var in self.column_vars.values():
            var.set(False)
    
    def export_columns(self):
        if not self.csv_file:
            messagebox.showwarning("Warning", "Please select a CSV file first!")
            return
            
        # Get selected columns and their original indices
        selected_columns = []
        selected_indices = []
        
        for i, col in enumerate(self.columns):
            if col in self.column_vars and self.column_vars[col].get():
                selected_columns.append(col)
                selected_indices.append(i)
        
        if not selected_columns:
            messagebox.showwarning("Warning", "Please select at least one column!")
            return
        
        output_file = filedialog.asksaveasfilename(
            defaultextension=".csv",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")],
            initialdir=os.path.dirname(self.csv_file),
            initialfile=f"selected_{os.path.basename(self.csv_file)}"
        )
        
        if output_file:
            try:
                # Read with detected encoding
                input_encoding = self.detect_encoding(self.csv_file)
                
                # Write with UTF-8-BOM encoding
                with codecs.open(self.csv_file, 'r', encoding=input_encoding) as infile, \
                     codecs.open(output_file, 'w', encoding='utf-8-sig') as outfile:
                    reader = csv.reader(infile)
                    writer = csv.writer(outfile)
                    
                    # Write header
                    writer.writerow(selected_columns)
                    
                    # Skip header in input file
                    next(reader)
                    
                    # Write selected columns for each row
                    for row in reader:
                        selected_row = [row[i] for i in selected_indices]
                        writer.writerow(selected_row)
                        
                messagebox.showinfo("Success", 
                                  f"Selected columns exported to {output_file}")
            except Exception as e:
                messagebox.showerror("Error", f"Error exporting CSV: {str(e)}")

if __name__ == "__main__":
    root = tk.Tk()
    app = CSVSplitterApp(root)
    root.mainloop()
