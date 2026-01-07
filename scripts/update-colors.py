#!/usr/bin/env python3
import os
import re
from pathlib import Path

# Renk değişimleri
color_replacements = {
    '#1976d2': '#1e40af',  # Primary mavi -> koyu mavi
    '#dc004e': '#f97316',  # Secondary pembe -> turuncu
    '#667eea': '#1e40af',  # Login gradient mavi -> koyu mavi
    '#764ba2': '#f97316',  # Login gradient mor -> turuncu
    'rgba(25, 118, 210,': 'rgba(30, 64, 175,',  # Primary rgba
    'rgba(220, 0, 78,': 'rgba(249, 115, 22,',  # Secondary rgba
}

def update_file(filepath):
    """Dosyayı oku, renkleri güncelle ve kaydet"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Tüm renkleri değiştir
        for old_color, new_color in color_replacements.items():
            content = content.replace(old_color, new_color)
        
        # Sadece değişiklik varsa kaydet
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    # app ve components klasörlerini tara
    directories = ['app', 'components']
    updated_files = []
    
    for directory in directories:
        if not os.path.exists(directory):
            continue
        
        for root, dirs, files in os.walk(directory):
            # node_modules ve .next klasörlerini atla
            dirs[:] = [d for d in dirs if d not in ['node_modules', '.next', '.git']]
            
            for file in files:
                if file.endswith(('.tsx', '.ts', '.css')):
                    filepath = os.path.join(root, file)
                    if update_file(filepath):
                        updated_files.append(filepath)
    
    print(f"Updated {len(updated_files)} files:")
    for f in updated_files[:10]:  # İlk 10'u göster
        print(f"  - {f}")
    if len(updated_files) > 10:
        print(f"  ... and {len(updated_files) - 10} more files")

if __name__ == '__main__':
    main()

