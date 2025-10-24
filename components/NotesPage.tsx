import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Note } from '../types';
import { 
    MagnifyingGlassIcon, XMarkIcon, PinIcon, SolidPinIcon, PaintBrushIcon,
    TrashIcon, BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon,
    ListBulletIcon, QueueListIcon, ChatBubbleLeftQuoteIcon, PlusIcon, EllipsisVerticalIcon, ClipboardDocumentIcon
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

// Helper function to execute rich text commands
const formatDoc = (cmd: string, value: string | null = null) => {
    document.execCommand(cmd, false, value);
};

// Reusable Editor Toolbar
const EditorToolbar: React.FC = () => {
    const commands = [
        { cmd: 'bold', icon: BoldIcon, title: 'عريض' },
        { cmd: 'italic', icon: ItalicIcon, title: 'مائل' },
        { cmd: 'underline', icon: UnderlineIcon, title: 'تحته خط' },
        { cmd: 'strikeThrough', icon: StrikethroughIcon, title: 'يتوسطه خط' },
        { cmd: 'insertUnorderedList', icon: ListBulletIcon, title: 'قائمة نقطية' },
        { cmd: 'insertOrderedList', icon: QueueListIcon, title: 'قائمة رقمية' },
        { cmd: 'formatBlock', value: 'BLOCKQUOTE', icon: ChatBubbleLeftQuoteIcon, title: 'اقتباس' },
    ];

    return (
        <div className="flex items-center gap-1">
            {commands.map(({ cmd, value, icon: Icon, title }) => (
                <button
                    key={cmd + (value || '')}
                    type="button"
                    onMouseDown={e => {
                        e.preventDefault(); // Prevent losing focus from the editor
                        formatDoc(cmd, value || null);
                    }}
                    title={title}
                    className="p-2 rounded-full hover:bg-black/30 transition-colors"
                >
                    <Icon className="w-5 h-5" />
                </button>
            ))}
        </div>
    );
};

// A small popover for color selection, used in multiple places
const ColorPickerPopover: React.FC<{ onSelect: (color: string) => void; children: React.ReactNode; }> = ({ onSelect, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    useClickOutside(popoverRef, () => setIsOpen(false));

    return (
        <div ref={popoverRef} className="relative">
            <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-2 rounded-full hover:bg-black/30 transition-colors">
                {children}
            </button>
            {isOpen && (
                 <div className="absolute bottom-full mb-2 bg-slate-900 p-2 rounded-lg grid grid-cols-6 gap-2 border border-slate-700 shadow-lg animate-fade-in-fast z-10">
                    {NOTE_COLORS.map(color => (
                        <button 
                            key={color} 
                            style={{backgroundColor: color}} 
                            onClick={(e) => { e.stopPropagation(); onSelect(color); setIsOpen(false); }} 
                            className={'w-6 h-6 rounded-full transition-transform hover:scale-110 ring-white ring-offset-slate-900 focus:ring-2'}
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
    const [editorState, setEditorState] = useState<{ mode: 'closed' | 'adding'; note: null } | { mode: 'editing'; note: Note }>({ mode: 'closed', note: null });


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
            setEditorState({ mode: 'closed', note: null });
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        const { error } = await supabase.from('notes').delete().eq('id', noteId);
        if (error) {
            console.error("Error deleting note:", error.message);
        } else {
            handleDatabaseChange("حذف ملاحظة");
            setEditorState({ mode: 'closed', note: null });
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

            {loading ? (
                <p className="text-center text-slate-400 py-8">جاري تحميل الملاحظات...</p>
            ) : notes.length === 0 && !searchTerm ? (
                <div className="text-center py-16 flex flex-col items-center gap-4 text-slate-500">
                    <ClipboardDocumentIcon className="w-16 h-16"/>
                    <h3 className="text-xl font-semibold text-slate-300">ملاحظاتك ستظهر هنا</h3>
                    <p>اضغط على زر + لبدء تدوين أفكارك.</p>
                </div>
            ) : (
                <>
                    {pinnedNotes.length > 0 && (
                        <NotesSection 
                            title="المثبتة"
                            notes={pinnedNotes}
                            onEdit={(note) => setEditorState({ mode: 'editing', note })}
                            onDelete={handleDeleteNote}
                            onUpdateField={handleUpdateNoteField}
                        />
                    )}
                    {otherNotes.length > 0 && (
                         <NotesSection 
                            title={pinnedNotes.length > 0 ? "الأخرى" : undefined}
                            notes={otherNotes}
                            onEdit={(note) => setEditorState({ mode: 'editing', note })}
                            onDelete={handleDeleteNote}
                            onUpdateField={handleUpdateNoteField}
                        />
                    )}
                    {filteredNotes.length === 0 && searchTerm && <p className="text-center text-slate-400 py-8">لم يتم العثور على ملاحظات تطابق بحثك.</p>}
                </>
            )}

            <button onClick={() => setEditorState({ mode: 'adding', note: null })} className="fixed bottom-20 right-4 h-14 w-14 bg-cyan-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-cyan-500 transition-transform transform active:scale-90 z-10">
                <PlusIcon className="w-8 h-8"/>
            </button>

            {editorState.mode !== 'closed' && (
                <NoteEditorModal 
                    key={editorState.note?.id || 'new-note'}
                    note={editorState.note}
                    onSave={handleSaveNote}
                    onDelete={handleDeleteNote}
                    onCancel={() => setEditorState({ mode: 'closed', note: null })}
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
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useClickOutside(menuRef, () => setIsMenuOpen(false));

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
                className="relative border border-slate-700 rounded-lg cursor-pointer break-inside-avoid-column hover:border-cyan-500/60 hover:shadow-lg hover:shadow-cyan-900/20 hover:-translate-y-1 transition-all duration-300 shadow-md h-full flex flex-col"
                style={{ backgroundColor: note.color }}
            >
                <div onClick={onEdit} className="flex-grow p-4 pb-2">
                    <div className="note-card-content">
                        {title && <h3 className="font-bold text-lg mb-2 break-words">{title}</h3>}
                        <div className="text-slate-200 break-words prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
                    </div>
                </div>
                
                <div className="flex items-center justify-end p-1">
                    <div ref={menuRef} className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(v => !v); }} title="المزيد من الإجراءات" className="p-2 rounded-full hover:bg-black/30 transition-colors opacity-60 group-hover:opacity-100">
                            <EllipsisVerticalIcon className="w-5 h-5"/>
                        </button>
                        {isMenuOpen && (
                             <div className="note-action-menu absolute left-0 bottom-full mb-1 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-20 animate-fade-in-fast p-1">
                                <button onClick={(e) => { e.stopPropagation(); onUpdateField({ is_pinned: !note.is_pinned }); setIsMenuOpen(false); }}>
                                    {note.is_pinned ? <SolidPinIcon className="w-5 h-5 text-cyan-300" /> : <PinIcon className="w-5 h-5" />}
                                    <span>{note.is_pinned ? "إلغاء التثبيت" : "تثبيت الملاحظة"}</span>
                                </button>
                                <div className="color-picker-container">
                                     <p className="text-xs text-slate-400 mb-2 px-1">اللون</p>
                                     <div className="grid grid-cols-6 gap-2">
                                         {NOTE_COLORS.map(color => (
                                            <button 
                                                key={color} 
                                                style={{backgroundColor: color}} 
                                                onClick={(e) => { e.stopPropagation(); onUpdateField({ color }); setIsMenuOpen(false); }} 
                                                className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ring-white ring-offset-slate-900 focus:ring-2`}
                                            />
                                        ))}
                                     </div>
                                </div>
                                 <div className="border-t border-slate-700 my-1"></div>
                                 <button onClick={(e) => { e.stopPropagation(); onDelete(); setIsMenuOpen(false); }} className="delete-btn">
                                    <TrashIcon className="w-5 h-5"/>
                                    <span>حذف الملاحظة</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const NoteEditorModal: React.FC<{
    note: Note | null;
    onSave: (note: Note | Omit<Note, 'id' | 'created_at' | 'updated_at'>) => void;
    onDelete: (id: string) => void;
    onCancel: () => void;
}> = ({ note: initialNote, onSave, onDelete, onCancel }) => {
    const defaultNewNote = useMemo(() => ({ 
        note_text: '', 
        color: NOTE_COLORS[0], 
        is_pinned: false, 
        is_code: false, 
        language: null 
    }), []);
    
    const [note, setNote] = useState(initialNote || defaultNewNote);
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

    const handleSave = useCallback(() => {
        const newTitle = titleRef.current?.value.trim() || '';
        const newContent = contentRef.current?.innerHTML.trim() || '';
        const newNoteText = newTitle ? `<h2>${newTitle}</h2>${newContent}` : newContent;
        
        if (!initialNote && !newTitle && !newContent) {
            onCancel();
            return;
        }

        const finalNoteData = { ...note, note_text: newNoteText };
        onSave(finalNoteData);
    }, [initialNote, note, onSave, onCancel]);

    const handleColorSelect = (color: string) => {
        setNote(prev => ({ ...prev, color }));
    };

    const modalRef = useRef<HTMLDivElement>(null);
    useClickOutside(modalRef, handleSave);
    
    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
        }
    }, [title]);

    return (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 animate-fade-in">
            <div ref={modalRef} className="bg-slate-800 w-full h-full flex flex-col" style={{ backgroundColor: note.color }}>
                <div className="p-4 flex-grow flex flex-col overflow-y-auto">
                    <textarea
                        ref={titleRef}
                        defaultValue={title}
                        placeholder="العنوان"
                        className="bg-transparent text-xl font-bold placeholder-slate-400/70 focus:outline-none resize-none overflow-hidden mb-2"
                        rows={1}
                        onInput={(e) => {
                             const target = e.currentTarget;
                             target.style.height = 'auto';
                             target.style.height = `${target.scrollHeight}px`;
                        }}
                    />
                    <div
                        ref={contentRef}
                        contentEditable
                        suppressContentEditableWarning
                        dangerouslySetInnerHTML={{ __html: content }}
                        className="flex-grow outline-none prose prose-invert max-w-none"
                        data-placeholder="اكتب ملاحظتك..."
                    />
                </div>
                <div className="flex justify-between items-center p-2 border-t border-white/10 flex-wrap">
                    <EditorToolbar />
                    <div className="flex items-center gap-1">
                        <ColorPickerPopover onSelect={handleColorSelect}>
                             <PaintBrushIcon className="w-5 h-5" />
                        </ColorPickerPopover>
                        {initialNote && (
                            <>
                                <button onClick={() => onSave({ ...note, is_pinned: !note.is_pinned })} title={note.is_pinned ? "إلغاء التثبيت" : "تثبيت"} className="p-2 rounded-full hover:bg-black/30 transition-colors">
                                    {note.is_pinned ? <SolidPinIcon className="w-5 h-5 text-cyan-300" /> : <PinIcon className="w-5 h-5" />}
                                </button>
                                <button onClick={() => onDelete(initialNote.id)} title="حذف" className="p-2 rounded-full hover:bg-black/30 transition-colors">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </>
                        )}
                         <button onClick={handleSave} className="py-2 px-5 bg-black/20 hover:bg-black/40 rounded-md transition text-sm">
                            تم
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotesPage;