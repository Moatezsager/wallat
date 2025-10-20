import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Note } from '../types';
import { 
    MagnifyingGlassIcon, XMarkIcon, PinIcon, SolidPinIcon, PaintBrushIcon,
    TrashIcon, EllipsisHorizontalIcon
} from './icons';

// A more vibrant and modern color palette
const NOTE_COLORS = [
    '#27272a', // zinc-800 (default)
    '#7f1d1d', // red-900
    '#7c2d12', // orange-900
    '#713f12', // amber-900
    '#365314', // lime-900
    '#064e3b', // emerald-900
    '#134e4a', // teal-900
    '#1e3a8a', // blue-900
    '#312e81', // indigo-900
    '#4c1d95', // violet-900
    '#831843', // fuchsia-900
    '#881337', // rose-900
];

const useClickOutside = (ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

// New AddNote component inspired by Google Keep
const AddNote: React.FC<{ onSave: (newNote: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => void }> = ({ onSave }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [color, setColor] = useState(NOTE_COLORS[0]);
    
    const containerRef = useRef<HTMLDivElement>(null);

    const resetForm = () => {
        setIsExpanded(false);
        setTitle('');
        setContent('');
        setColor(NOTE_COLORS[0]);
    };

    const handleSave = useCallback(() => {
        if (title.trim() || content.trim()) {
            const fullNoteText = `<h2>${title.trim()}</h2>${content}`;
            onSave({
                note_text: fullNoteText,
                color: color,
                is_pinned: false,
                is_code: false,
                language: null,
            });
        }
        resetForm();
    }, [title, content, color, onSave]);
    
    useClickOutside(containerRef, handleSave);
    
    return (
        <div ref={containerRef} className="max-w-xl mx-auto mb-8">
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 transition-all duration-300" style={{ backgroundColor: color }}>
                {isExpanded && (
                    <input 
                        type="text"
                        placeholder="العنوان"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-transparent p-3 text-lg font-bold placeholder-slate-400 focus:outline-none"
                    />
                )}
                <textarea
                    placeholder="اكتب ملاحظة جديدة..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onFocus={() => setIsExpanded(true)}
                    rows={isExpanded ? 4 : 1}
                    className="w-full bg-transparent p-3 placeholder-slate-400 focus:outline-none resize-none"
                />
                 {isExpanded && (
                    <div className="flex justify-between items-center p-2">
                        <ColorPickerPopover selectedColor={color} onSelect={setColor} />
                        <button onClick={handleSave} className="py-2 px-5 bg-black/20 hover:bg-black/40 rounded-md transition text-sm">
                            تم
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// A small popover for color selection
const ColorPickerPopover: React.FC<{ selectedColor: string; onSelect: (color: string) => void }> = ({ selectedColor, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    useClickOutside(popoverRef, () => setIsOpen(false));

    return (
        <div ref={popoverRef} className="relative">
            <button onClick={() => setIsOpen(!isOpen)} title="تغيير اللون" className="p-2 rounded-full hover:bg-black/30 transition-colors">
                <PaintBrushIcon className="w-5 h-5" />
            </button>
            {isOpen && (
                 <div className="absolute bottom-full mb-2 bg-slate-900 p-2 rounded-lg grid grid-cols-6 gap-2 border border-slate-700 shadow-lg animate-fade-in-fast">
                    {NOTE_COLORS.map(color => (
                        <button 
                            key={color} 
                            style={{backgroundColor: color}} 
                            onClick={() => { onSelect(color); setIsOpen(false); }} 
                            className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-white' : ''}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Main Page Component
const NotesPage: React.FC<{ key: number; handleDatabaseChange: (description?: string) => void; }> = ({ key, handleDatabaseChange }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingNote, setEditingNote] = useState<Note | null>(null);

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('notes').select('*').order('is_pinned', { ascending: false }).order('updated_at', { ascending: false });
        if (error) {
            console.error("Error fetching notes:", error.message);
        } else {
            setNotes(data as Note[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchNotes();
    }, [key, fetchNotes]);

    const filteredNotes = useMemo(() => {
        if (!searchTerm) return notes;
        const tempDiv = document.createElement('div');
        return notes.filter(note => {
            tempDiv.innerHTML = note.note_text;
            const textContent = tempDiv.textContent || tempDiv.innerText || '';
            return textContent.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [notes, searchTerm]);
    
    const pinnedNotes = useMemo(() => filteredNotes.filter(n => n.is_pinned), [filteredNotes]);
    const otherNotes = useMemo(() => filteredNotes.filter(n => !n.is_pinned), [filteredNotes]);

    const handleSaveNote = async (noteToSave: Note | Omit<Note, 'id' | 'created_at' | 'updated_at'>) => {
        const isUpdate = 'id' in noteToSave;
        const noteData = isUpdate 
            ? { ...noteToSave, updated_at: new Date().toISOString() }
            : noteToSave;

        const { error } = isUpdate
            ? await supabase.from('notes').update(noteData).eq('id', (noteToSave as Note).id)
            : await supabase.from('notes').insert(noteData);
        
        if (error) {
            console.error("Error saving note:", error.message);
        } else {
            handleDatabaseChange(isUpdate ? "تحديث ملاحظة" : "إضافة ملاحظة جديدة");
            setEditingNote(null);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        const { error } = await supabase.from('notes').delete().eq('id', noteId);
        if (error) {
            console.error("Error deleting note:", error.message);
        } else {
            handleDatabaseChange("حذف ملاحظة");
        }
    };
    
    const handleUpdateNoteField = async (noteId: string, updates: Partial<Note>) => {
        const { error } = await supabase.from('notes').update(updates).eq('id', noteId);
        if (error) {
             console.error("Error updating note:", error.message);
        } else {
            handleDatabaseChange("تحديث ملاحظة");
        }
    }

    return (
        <div className="space-y-6">
            <div className="max-w-xl mx-auto">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="ابحث في ملاحظاتك..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pr-10 pl-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
            </div>

            <AddNote onSave={handleSaveNote} />

            {loading ? (
                <p className="text-center text-slate-400 py-8">جاري تحميل الملاحظات...</p>
            ) : (
                <>
                    {pinnedNotes.length > 0 && (
                        <NotesSection 
                            title="المثبتة"
                            notes={pinnedNotes}
                            onEdit={setEditingNote}
                            onDelete={handleDeleteNote}
                            onUpdateField={handleUpdateNoteField}
                        />
                    )}
                    {otherNotes.length > 0 && (
                         <NotesSection 
                            title={pinnedNotes.length > 0 ? "الأخرى" : undefined}
                            notes={otherNotes}
                            onEdit={setEditingNote}
                            onDelete={handleDeleteNote}
                            onUpdateField={handleUpdateNoteField}
                        />
                    )}
                    {notes.length === 0 && <p className="text-center text-slate-400 py-8">لا توجد ملاحظات لعرضها. هيا بنا نكتب أول ملاحظة!</p>}
                </>
            )}

            {editingNote && (
                <NoteEditorModal 
                    note={editingNote}
                    onSave={handleSaveNote}
                    onDelete={handleDeleteNote}
                    onCancel={() => setEditingNote(null)}
                />
            )}
        </div>
    );
};

const NotesSection: React.FC<{
    title?: string;
    notes: Note[];
    onEdit: (note: Note) => void;
    onDelete: (id: string) => void;
    onUpdateField: (id: string, updates: Partial<Note>) => void;
}> = ({ title, notes, onEdit, onDelete, onUpdateField }) => (
    <div>
        {title && <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{title}</h2>}
        <div className="masonry-grid">
            {notes.map(note => (
                <NoteCard 
                    key={note.id}
                    note={note}
                    onEdit={() => onEdit(note)}
                    onDelete={() => onDelete(note.id)}
                    onUpdateField={(updates) => onUpdateField(note.id, updates)}
                />
            ))}
        </div>
    </div>
);

const NoteCard: React.FC<{
    note: Note;
    onEdit: () => void;
    onDelete: () => void;
    onUpdateField: (updates: Partial<Note>) => void;
}> = ({ note, onEdit, onDelete, onUpdateField }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [title, content] = useMemo(() => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.note_text;
        const titleElement = tempDiv.querySelector('h1, h2, h3, h4, h5, h6');
        const titleText = titleElement?.textContent || '';
        titleElement?.remove();
        const contentText = tempDiv.innerHTML;
        return [titleText, contentText];
    }, [note.note_text]);

    return (
        <div className="masonry-item group">
            <div 
                className="relative border border-slate-700 rounded-lg p-4 cursor-pointer break-inside-avoid-column hover:border-slate-500 transition-colors shadow-md"
                style={{ backgroundColor: note.color }}
                onClick={onEdit}
            >
                {note.is_pinned && <SolidPinIcon className="absolute top-2 left-2 w-5 h-5 text-cyan-300" />}

                <div className="flex flex-col h-full">
                    {title && <h3 className="font-bold text-lg mb-2 break-words">{title}</h3>}
                    <div ref={contentRef} className="text-slate-200 break-words prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
                    
                    <div className="mt-4 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <ColorPickerPopover selectedColor={note.color} onSelect={(color) => onUpdateField({ color })} />
                         <button onClick={e => { e.stopPropagation(); onUpdateField({ is_pinned: !note.is_pinned }); }} title={note.is_pinned ? "إلغاء التثبيت" : "تثبيت"} className="p-2 rounded-full hover:bg-black/30 transition-colors">
                            <PinIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={e => { e.stopPropagation(); onDelete(); }} title="حذف" className="p-2 rounded-full hover:bg-black/30 transition-colors">
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Editor Modal is now a centered modal for focused editing
const NoteEditorModal: React.FC<{
    note: Note;
    onSave: (note: Note) => void;
    onDelete: (id: string) => void;
    onCancel: () => void;
}> = ({ note: initialNote, onSave, onDelete, onCancel }) => {
    const [note, setNote] = useState(initialNote);
    const contentRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLTextAreaElement>(null);

    const [title, content] = useMemo(() => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.note_text;
        const titleElement = tempDiv.querySelector('h1, h2, h3, h4, h5, h6');
        const titleText = titleElement?.textContent || '';
        titleElement?.remove();
        const contentText = tempDiv.innerHTML;
        return [titleText, contentText];
    }, [note.note_text]);

    const handleSave = () => {
        const newTitle = titleRef.current?.value || '';
        const newContent = contentRef.current?.innerHTML || '';
        const newNoteText = newTitle ? `<h2>${newTitle}</h2>${newContent}` : newContent;
        onSave({ ...note, note_text: newNoteText });
    };

    const handleNoteUpdate = (updates: Partial<Note>) => {
        setNote(prev => ({ ...prev, ...updates }));
    };

    const modalRef = useRef<HTMLDivElement>(null);
    useClickOutside(modalRef, handleSave);
    
    // Auto-resize textarea for title
    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
        }
    }, [title]);

    return (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div ref={modalRef} className="rounded-lg w-full max-w-2xl border border-slate-700 shadow-xl animate-slide-up max-h-[80vh] flex flex-col" style={{ backgroundColor: note.color }}>
                <div className="p-4 flex-grow flex flex-col overflow-y-auto">
                    <textarea
                        ref={titleRef}
                        defaultValue={title}
                        placeholder="العنوان"
                        className="bg-transparent text-xl font-bold placeholder-slate-400/70 focus:outline-none resize-none overflow-hidden mb-2"
                        rows={1}
                    />
                    <div
                        ref={contentRef}
                        contentEditable
                        suppressContentEditableWarning
                        dangerouslySetInnerHTML={{ __html: content }}
                        className="flex-grow outline-none prose prose-invert max-w-none prose-p:my-2"
                        placeholder="اكتب ملاحظتك..."
                    />
                </div>
                <div className="flex justify-between items-center p-2 border-t border-white/10">
                    <div className="flex items-center gap-1">
                        <ColorPickerPopover selectedColor={note.color} onSelect={(color) => handleNoteUpdate({ color })} />
                        <button onClick={() => handleNoteUpdate({ is_pinned: !note.is_pinned })} title={note.is_pinned ? "إلغاء التثبيت" : "تثبيت"} className="p-2 rounded-full hover:bg-black/30 transition-colors">
                            {note.is_pinned ? <SolidPinIcon className="w-5 h-5 text-cyan-300" /> : <PinIcon className="w-5 h-5" />}
                        </button>
                        <button onClick={() => { onDelete(note.id); onCancel(); }} title="حذف" className="p-2 rounded-full hover:bg-black/30 transition-colors">
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                    </div>
                    <button onClick={handleSave} className="py-2 px-5 bg-black/20 hover:bg-black/40 rounded-md transition text-sm">
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotesPage;