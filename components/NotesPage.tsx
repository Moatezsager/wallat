import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Note } from '../types';
import { useToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import { 
    MagnifyingGlassIcon, XMarkIcon, PinIcon, SolidPinIcon, PaintBrushIcon,
    TrashIcon, BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon,
    ListBulletIcon, QueueListIcon, ChatBubbleLeftQuoteIcon, PlusIcon, ArrowLeftIcon, 
    ClipboardDocumentIcon, CopyIcon, UndoIcon, RedoIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon,
    Heading1Icon, Heading2Icon, CheckSquareIcon, CalendarDaysIcon, PencilSquareIcon,
    SparklesIcon
} from './icons';

// --- الثوابت والمساعدات ---
const NOTE_THEMES = [ 
    { id: 'zinc', bg: 'rgba(39, 39, 42, 0.7)', border: '#52525b', accent: '#71717a' }, 
    { id: 'red', bg: 'rgba(69, 10, 10, 0.7)', border: '#991b1b', accent: '#ef4444' }, 
    { id: 'orange', bg: 'rgba(67, 20, 7, 0.7)', border: '#9a3412', accent: '#f97316' }, 
    { id: 'amber', bg: 'rgba(69, 26, 3, 0.7)', border: '#92400e', accent: '#f59e0b' }, 
    { id: 'emerald', bg: 'rgba(2, 44, 34, 0.7)', border: '#065f46', accent: '#10b981' }, 
    { id: 'teal', bg: 'rgba(4, 47, 46, 0.7)', border: '#115e59', accent: '#14b8a6' }, 
    { id: 'cyan', bg: 'rgba(8, 51, 68, 0.7)', border: '#155e75', accent: '#06b6d4' }, 
    { id: 'blue', bg: 'rgba(23, 37, 84, 0.7)', border: '#1e40af', accent: '#3b82f6' }, 
    { id: 'indigo', bg: 'rgba(30, 27, 75, 0.7)', border: '#3730a3', accent: '#6366f1' }, 
    { id: 'violet', bg: 'rgba(46, 16, 101, 0.7)', border: '#5b21b6', accent: '#8b5cf6' }, 
    { id: 'fuchsia', bg: 'rgba(74, 4, 78, 0.7)', border: '#86198f', accent: '#d946ef' }, 
    { id: 'rose', bg: 'rgba(76, 5, 25, 0.7)', border: '#9f1239', accent: '#f43f5e' }, 
];

const useClickOutside = (ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void, active: boolean) => { 
    useEffect(() => { 
        if (!active) return; 
        const listener = (event: MouseEvent | TouchEvent) => { 
            if (!ref.current || ref.current.contains(event.target as Node)) return; 
            handler(event); 
        }; 
        document.addEventListener('mousedown', listener); 
        document.addEventListener('touchstart', listener); 
        return () => { 
            document.removeEventListener('mousedown', listener); 
            document.removeEventListener('touchstart', listener); 
        }; 
    }, [ref, handler, active]); 
};

const formatDoc = (cmd: string, value: string | undefined = undefined) => { 
    document.execCommand(cmd, false, value); 
    const editor = document.getElementById('rich-text-editor'); 
    if(editor) editor.focus(); 
};

const insertCheckbox = () => { 
    const html = '<ul class="checklist"><li><input type="checkbox"> </li></ul>'; 
    document.execCommand('insertHTML', false, html); 
}

// --- المكونات الفرعية ---

const EditorToolbar: React.FC = () => { 
    const groups = [ 
        [ { cmd: 'undo', icon: UndoIcon, title: 'تراجع' }, { cmd: 'redo', icon: RedoIcon, title: 'إعادة' }, ], 
        [ { cmd: 'formatBlock', value: 'H2', icon: Heading1Icon, title: 'عنوان كبير' }, { cmd: 'formatBlock', value: 'H3', icon: Heading2Icon, title: 'عنوان متوسط' }, ], 
        [ { cmd: 'bold', icon: BoldIcon, title: 'عريض' }, { cmd: 'italic', icon: ItalicIcon, title: 'مائل' }, { cmd: 'underline', icon: UnderlineIcon, title: 'تحته خط' }, { cmd: 'strikeThrough', icon: StrikethroughIcon, title: 'يتوسطه خط' }, ], 
        [ { cmd: 'justifyLeft', icon: AlignLeftIcon, title: 'يسار' }, { cmd: 'justifyCenter', icon: AlignCenterIcon, title: 'وسط' }, { cmd: 'justifyRight', icon: AlignRightIcon, title: 'يمين' }, ], 
        [ { cmd: 'insertUnorderedList', icon: ListBulletIcon, title: 'قائمة نقطية' }, { cmd: 'insertOrderedList', icon: QueueListIcon, title: 'قائمة رقمية' }, { action: insertCheckbox, icon: CheckSquareIcon, title: 'قائمة مهام' }, ], 
        [ { cmd: 'formatBlock', value: 'BLOCKQUOTE', icon: ChatBubbleLeftQuoteIcon, title: 'اقتباس' }, ] 
    ]; 
    return ( 
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 px-1"> 
            {groups.map((group, idx) => ( 
                <div key={idx} className="flex items-center gap-0.5 bg-slate-900/80 backdrop-blur-md rounded-xl p-1.5 border border-white/10 shadow-lg"> 
                    {group.map((btn: any) => ( 
                        <button key={btn.title} type="button" onMouseDown={e => { e.preventDefault(); if (btn.action) btn.action(); else formatDoc(btn.cmd, btn.value || null); }} title={btn.title} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-cyan-400 transition-all active:scale-90" > 
                            <btn.icon className="w-5 h-5" /> 
                        </button> 
                    ))} 
                </div> 
            ))} 
        </div> 
    ); 
};

const ColorPickerPopover: React.FC<{ onSelect: (color: string) => void; currentColor: string; children: React.ReactNode; }> = ({ onSelect, currentColor, children }) => { 
    const [isOpen, setIsOpen] = useState(false); 
    const popoverRef = useRef<HTMLDivElement>(null); 
    useClickOutside(popoverRef, () => setIsOpen(false), isOpen); 
    return ( 
        <div ref={popoverRef} className="relative"> 
            <button type="button" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-2.5 rounded-2xl hover:bg-black/20 text-slate-400 hover:text-white transition-all"> 
                {children} 
            </button> 
            {isOpen && ( 
                <div className="absolute bottom-full left-0 mb-4 bg-slate-900/95 backdrop-blur-2xl p-4 rounded-[2rem] grid grid-cols-4 gap-3 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-slide-up z-[60] w-56"> 
                    {NOTE_THEMES.map(theme => ( 
                        <button key={theme.id} type="button" style={{ backgroundColor: theme.bg, borderColor: theme.border }} onClick={(e) => { e.stopPropagation(); onSelect(theme.bg); setIsOpen(false); }} className={`w-9 h-9 rounded-full transition-all duration-300 hover:scale-110 border-2 ${currentColor === theme.bg ? 'ring-2 ring-white scale-110 shadow-lg shadow-white/10' : 'opacity-80 hover:opacity-100'}`} /> 
                    ))} 
                </div> 
            )} 
        </div> 
    ); 
};

// --- المكون الرئيسي ---

const NotesPage: React.FC<{ refreshTrigger: number; handleDatabaseChange: (description?: string) => void; }> = ({ refreshTrigger, handleDatabaseChange }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const toast = useToast();
    const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
    
    const [editorState, setEditorState] = useState<{ 
        mode: 'closed' | 'adding' | 'viewing' | 'editing'; 
        note: Note | null 
    }>({ mode: 'closed', note: null });

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
    }, [refreshTrigger, fetchNotes]);

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
            : { ...noteToSave, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

        const { error } = isUpdate
            ? await supabase.from('notes').update(noteData).eq('id', (noteToSave as Note).id)
            : await supabase.from('notes').insert(noteData);
        
        if (error) {
            console.error("Error saving note:", error.message);
            toast.error("فشل حفظ الملاحظة");
        } else {
            const message = isUpdate ? "تم تحديث الملاحظة بنجاح" : "تم إضافة ملاحظة جديدة";
            handleDatabaseChange(message);
            toast.success(message);
            setEditorState({ mode: 'closed', note: null });
        }
    };

    const confirmDelete = (noteId: string) => {
        setNoteToDelete(noteId);
    }

    const handleDeleteNote = async () => {
        if (!noteToDelete) return;
        const { error } = await supabase.from('notes').delete().eq('id', noteToDelete);
        if (error) {
            console.error("Error deleting note:", error.message);
            toast.error("فشل حذف الملاحظة");
        } else {
            handleDatabaseChange("تم حذف الملاحظة");
            toast.success("تم حذف الملاحظة بنجاح");
            setEditorState({ mode: 'closed', note: null });
        }
        setNoteToDelete(null);
    };
    
    const handleUpdateNoteField = async (noteId: string, updates: Partial<Note>) => {
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...updates } : n));
        const { error } = await supabase.from('notes').update({...updates, updated_at: new Date().toISOString()}).eq('id', noteId);
        if (error) {
             console.error("Error updating note:", error.message);
             fetchNotes(); 
        } else {
            handleDatabaseChange(); 
        }
    }

    return (
        <div className="space-y-10 pb-32 max-w-6xl mx-auto">
            {/* Search Header */}
            <div className="sticky top-20 z-10 mx-auto w-full px-2">
                <div className="relative group max-w-2xl mx-auto">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-[2rem] blur-xl group-hover:blur-2xl transition-all opacity-40"></div>
                    <div className="relative bg-slate-900/60 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex items-center p-1.5 ring-1 ring-white/5">
                        <div className="p-3">
                            <MagnifyingGlassIcon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="ابحث في أفكارك وخططك..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent py-4 text-white placeholder-slate-500 focus:outline-none font-bold text-lg"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="p-3 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-colors mx-1">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-2">
                    {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-slate-800/40 rounded-[2.5rem] animate-pulse border border-white/5"></div>)}
                </div>
            ) : notes.length === 0 && !searchTerm ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 animate-fade-in">
                    <div className="relative">
                        <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full"></div>
                        <div className="relative w-32 h-32 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[3rem] flex items-center justify-center shadow-2xl border border-white/5 ring-1 ring-white/10 rotate-3 transition-transform hover:rotate-0 duration-500">
                            <ClipboardDocumentIcon className="w-14 h-14 text-slate-600"/>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-2xl font-black text-white tracking-tight">مساحتك الخاصة للإبداع</h3>
                        <p className="text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">سجل أفكارك، مهامك، أو أي شيء تريد تذكره. كل مشروع عظيم بدأ بملاحظة بسيطة.</p>
                    </div>
                    <button 
                        onClick={() => setEditorState({ mode: 'adding', note: null })}
                        className="bg-white text-slate-900 px-10 py-5 rounded-[2rem] font-black text-lg shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:bg-cyan-50 active:scale-95 transition-all flex items-center gap-3"
                    >
                        <PlusIcon className="w-6 h-6" /> ابدأ الآن
                    </button>
                </div>
            ) : (
                <div className="space-y-12 animate-fade-in px-2">
                    {pinnedNotes.length > 0 && (
                        <NotesSection 
                            title="المثبتة"
                            icon={<SolidPinIcon className="w-4 h-4 text-cyan-400" />}
                            notes={pinnedNotes}
                            onClick={(note) => setEditorState({ mode: 'viewing', note })}
                            onDelete={confirmDelete}
                            onUpdateField={handleUpdateNoteField}
                        />
                    )}
                    {otherNotes.length > 0 && (
                         <NotesSection 
                            title={pinnedNotes.length > 0 ? "الملاحظات الأخرى" : undefined}
                            notes={otherNotes}
                            onClick={(note) => setEditorState({ mode: 'viewing', note })}
                            onDelete={confirmDelete}
                            onUpdateField={handleUpdateNoteField}
                        />
                    )}
                    {filteredNotes.length === 0 && searchTerm && (
                        <div className="text-center py-20 bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800 mx-4">
                            <p className="text-slate-500 font-bold">لم يتم العثور على ملاحظات تطابق "<span className="text-white">{searchTerm}</span>"</p>
                        </div>
                    )}
                </div>
            )}

            {/* FAB */}
            <button 
                onClick={() => setEditorState({ mode: 'adding', note: null })} 
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 h-20 w-20 bg-slate-900 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-500 border-4 border-slate-900 overflow-visible hover:scale-110 active:scale-95 group mb-safe"
            >
                <div className="absolute inset-1.5 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-[1.6rem] flex items-center justify-center shadow-inner">
                    <PlusIcon className="w-10 h-10 text-white transition-transform duration-500 group-hover:rotate-90"/>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full animate-ping opacity-20"></div>
            </button>

            <ConfirmDialog 
                isOpen={!!noteToDelete}
                title="حذف الملاحظة"
                message="هل أنت متأكد من رغبتك في حذف هذه الملاحظة نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
                confirmText="حذف نهائياً"
                onConfirm={handleDeleteNote}
                onCancel={() => setNoteToDelete(null)}
            />

            {/* Modals */}
            {editorState.mode === 'viewing' && editorState.note && (
                <NoteViewerModal 
                    note={editorState.note}
                    onClose={() => setEditorState({ mode: 'closed', note: null })}
                    onEdit={() => setEditorState({ mode: 'editing', note: editorState.note })}
                    onDelete={confirmDelete}
                />
            )}

            {(editorState.mode === 'editing' || editorState.mode === 'adding') && (
                <NoteEditorModal 
                    key={editorState.note?.id || 'new-note'}
                    note={editorState.note}
                    onSave={handleSaveNote}
                    onDelete={confirmDelete}
                    onCancel={() => setEditorState({ mode: 'closed', note: null })}
                />
            )}
        </div>
    );
};

// --- المكونات الفرعية للعرض ---

const NotesSection: React.FC<{ title?: string; icon?: React.ReactNode; notes: Note[]; onClick: (note: Note) => void; onDelete: (id: string) => void; onUpdateField: (id: string, updates: Partial<Note>) => void; }> = ({ title, icon, notes, onClick, onDelete, onUpdateField }) => ( 
    <div className="animate-fade-in"> 
        {title && ( 
            <h2 className="flex items-center gap-3 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 px-4"> 
                {icon} {title} 
            </h2> 
        )} 
        <div className="columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6"> 
            {notes.map(note => ( 
                <NoteCard key={note.id} note={note} onClick={() => onClick(note)} onDelete={() => onDelete(note.id)} onUpdateField={(updates) => onUpdateField(note.id, updates)} /> 
            ))} 
        </div> 
    </div> 
);

const NoteCard: React.FC<{ note: Note; onClick: () => void; onDelete: () => void; onUpdateField: (updates: Partial<Note>) => void; }> = ({ note, onClick, onDelete, onUpdateField }) => { 
    const [title, content] = useMemo(() => { 
        const tempDiv = document.createElement('div'); 
        tempDiv.innerHTML = note.note_text; 
        const heading = tempDiv.querySelector('h1, h2, h3'); 
        let titleText = ''; 
        if (heading) { 
            titleText = heading.textContent || ''; 
            heading.remove(); 
        } 
        const contentHtml = tempDiv.innerHTML; 
        const cleanContent = contentHtml.replace(/<p><br><\/p>/g, '').trim(); 
        return [titleText, cleanContent]; 
    }, [note.note_text]); 

    const theme = useMemo(() => NOTE_THEMES.find(t => t.bg === note.color) || NOTE_THEMES[0], [note.color]);

    return ( 
        <div className="break-inside-avoid group perspective-1000"> 
            <div 
                onClick={onClick} 
                className="relative rounded-[2.5rem] cursor-pointer overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] border ring-1 ring-white/5 active:scale-95" 
                style={{ backgroundColor: note.color, borderColor: theme.border }} 
            > 
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 blur-[40px] opacity-10 rounded-full" style={{ backgroundColor: theme.accent }}></div>

                <div className="p-7 pb-16 min-h-[140px]"> 
                    {note.is_pinned && (
                        <div className="absolute top-6 left-6 text-white/40 bg-white/10 p-1.5 rounded-xl backdrop-blur-md border border-white/10">
                            <SolidPinIcon className="w-4 h-4 shadow-sm" />
                        </div>
                    )} 
                    {title ? ( 
                        <h3 className="font-black text-xl text-white mb-4 leading-tight tracking-tight">{title}</h3> 
                    ) : null} 
                    <div className="text-slate-200/80 text-base leading-relaxed line-clamp-6 prose prose-invert prose-sm max-w-none break-words font-medium" dangerouslySetInnerHTML={{ __html: content || (title ? '' : '<span class="italic opacity-30">مساحة فارغة...</span>') }} /> 
                </div> 

                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 backdrop-blur-sm"> 
                    <span className="text-[10px] text-white/50 px-3 py-1 bg-white/5 rounded-lg border border-white/5 font-black uppercase tracking-widest"> 
                        {new Date(note.updated_at).toLocaleDateString('ar-LY', {month:'short', day:'numeric'})} 
                    </span> 
                    <div className="flex gap-1.5"> 
                        <button type="button" onClick={(e) => { e.stopPropagation(); onUpdateField({ is_pinned: !note.is_pinned }); }} className="p-2.5 rounded-xl hover:bg-white/20 text-white/70 hover:text-cyan-400 transition-all active:scale-90 border border-transparent hover:border-white/10"> 
                            {note.is_pinned ? <SolidPinIcon className="w-5 h-5"/> : <PinIcon className="w-5 h-5"/>} 
                        </button> 
                        <ColorPickerPopover currentColor={note.color} onSelect={(color) => onUpdateField({ color })}> 
                            <PaintBrushIcon className="w-5 h-5 text-white/70" /> 
                        </ColorPickerPopover> 
                        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2.5 rounded-xl hover:bg-rose-500/20 text-white/70 hover:text-rose-400 transition-all active:scale-90 border border-transparent hover:border-white/10"> 
                            <TrashIcon className="w-5 h-5"/> 
                        </button> 
                    </div> 
                </div> 
            </div> 
        </div> 
    ); 
};

const NoteViewerModal: React.FC<{ note: Note; onClose: () => void; onEdit: () => void; onDelete: (id: string) => void; }> = ({ note, onClose, onEdit, onDelete }) => { 
    const contentRef = useRef<HTMLDivElement>(null); 
    const [wordCount, setWordCount] = useState(0); 
    const [copied, setCopied] = useState(false); 
    
    const [title, content] = useMemo(() => { 
        const tempDiv = document.createElement('div'); 
        tempDiv.innerHTML = note.note_text; 
        const heading = tempDiv.querySelector('h1, h2, h3'); 
        let titleText = ''; 
        if (heading) { 
            titleText = heading.textContent || ''; 
            heading.remove(); 
        } 
        return [titleText, tempDiv.innerHTML]; 
    }, [note.note_text]); 

    useEffect(() => { 
        if (contentRef.current) { 
            const text = contentRef.current.innerText || ""; 
            setWordCount(text.trim().split(/\s+/).filter(w => w.length > 0).length); 
        } 
    }, [note.note_text]); 

    const handleCopy = () => { 
        const tempDiv = document.createElement('div'); 
        tempDiv.innerHTML = note.note_text; 
        const text = tempDiv.innerText || tempDiv.textContent || ''; 
        navigator.clipboard.writeText(text); 
        setCopied(true); 
        setTimeout(() => setCopied(false), 2000); 
    }; 

    return ( 
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-6 animate-fade-in pt-safe pb-safe"> 
            <div className="w-full h-full flex flex-col sm:max-w-4xl sm:max-h-[90vh] sm:rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] transition-all duration-700 relative overflow-hidden ring-1 ring-white/10" style={{ backgroundColor: note.color }} > 
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="flex justify-between items-center p-6 bg-black/20 backdrop-blur-xl border-b border-white/10 shrink-0 z-20"> 
                    <button onClick={onClose} className="p-3 rounded-[1.2rem] bg-white/5 hover:bg-black/40 text-white transition-all active:scale-90 border border-white/5"> 
                        <ArrowLeftIcon className="w-7 h-7"/> 
                    </button> 
                    <div className="flex items-center gap-3"> 
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] hidden sm:inline-block"> 
                            {new Date(note.updated_at).toLocaleString('ar-LY')} 
                        </span> 
                        <div className="w-px h-8 bg-white/10 mx-2 hidden sm:block"></div> 
                        <button onClick={handleCopy} className="p-3 rounded-[1.2rem] bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all active:scale-90 border border-white/5" title="نسخ النص"> 
                            {copied ? <CheckSquareIcon className="w-6 h-6 text-emerald-400"/> : <CopyIcon className="w-6 h-6"/>} 
                        </button> 
                        <button onClick={onEdit} className="px-6 py-3 rounded-[1.2rem] bg-white text-black font-black text-sm hover:bg-cyan-50 transition-all active:scale-95 border border-white/10 shadow-xl flex items-center gap-2"> 
                            <PencilSquareIcon className="w-5 h-5"/> تعديل
                        </button> 
                    </div> 
                </div> 

                <div className="flex-grow flex flex-col overflow-y-auto custom-scrollbar relative z-10"> 
                    <div className="max-w-3xl mx-auto w-full px-8 py-16"> 
                        {title && ( 
                            <h1 className="text-4xl sm:text-5xl font-black text-white mb-10 leading-tight tracking-tight border-b-4 border-white/5 pb-8"> 
                                {title} 
                            </h1> 
                        )} 
                        <div ref={contentRef} className="prose prose-invert prose-xl max-w-none text-slate-100/90 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: content }} /> 
                    </div> 
                </div> 

                <div className="bg-black/30 backdrop-blur-2xl border-t border-white/10 p-5 pb-safe shrink-0 flex justify-between items-center px-10"> 
                    <div className="flex items-center gap-2 text-white/30 font-black text-[10px] uppercase tracking-widest">
                         <SparklesIcon className="w-4 h-4" /> {wordCount} كلمة
                    </div>
                    <button onClick={() => onDelete(note.id)} className="p-3 bg-rose-500/10 hover:bg-rose-500/20 rounded-[1.2rem] text-rose-400 transition-all active:scale-90"> 
                        <TrashIcon className="w-6 h-6"/> 
                    </button> 
                </div> 
            </div> 
        </div> 
    ); 
};

const NoteEditorModal: React.FC<{ note: Note | null; onSave: (note: Note | Omit<Note, 'id' | 'created_at' | 'updated_at'>) => void; onDelete: (id: string) => void; onCancel: () => void; }> = ({ note: initialNote, onSave, onDelete, onCancel }) => { 
    const defaultNewNote = useMemo(() => ({ note_text: '', color: NOTE_THEMES[0].bg, is_pinned: false, is_code: false, language: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }), []); 
    const [note, setNote] = useState(initialNote || defaultNewNote); 
    const contentRef = useRef<HTMLDivElement>(null); 
    const titleRef = useRef<HTMLTextAreaElement>(null); 
    const [wordCount, setWordCount] = useState(0); 

    useEffect(() => { 
        if (!initialNote) return; 
        const tempDiv = document.createElement('div'); 
        tempDiv.innerHTML = initialNote.note_text; 
        const heading = tempDiv.querySelector('h1, h2, h3'); 
        if (heading && titleRef.current) { 
            titleRef.current.value = heading.textContent || ''; 
            heading.remove(); 
        } 
        if (contentRef.current) { 
            contentRef.current.innerHTML = tempDiv.innerHTML; 
        } 
        updateStats(); 
    }, []); 

    const updateStats = () => { 
        if (contentRef.current) { 
            const text = contentRef.current.innerText || ""; 
            setWordCount(text.trim().split(/\s+/).filter(w => w.length > 0).length); 
        } 
    }; 

    const handleSave = useCallback(() => { 
        const newTitle = titleRef.current?.value.trim() || ''; 
        const newContent = contentRef.current?.innerHTML.trim() || ''; 
        if (!initialNote && !newTitle && !newContent) { 
            onCancel(); 
            return; 
        } 
        const newNoteText = newTitle ? `<h1>${newTitle}</h1>${newContent}` : newContent; 
        onSave({ ...note, note_text: newNoteText }); 
    }, [initialNote, note, onSave, onCancel]); 

    const handleTitleInput = (e: React.FormEvent<HTMLTextAreaElement>) => { 
        const target = e.currentTarget; 
        target.style.height = 'auto'; 
        target.style.height = `${target.scrollHeight}px`; 
    }; 

    return ( 
        <div className="fixed inset-0 z-[110] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-6 animate-fade-in pt-safe pb-safe"> 
            <div className="w-full h-full flex flex-col sm:max-w-4xl sm:max-h-[90vh] sm:rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] transition-all duration-700 relative overflow-hidden ring-1 ring-white/10" style={{ backgroundColor: note.color }} > 
                
                <div className="flex justify-between items-center p-6 bg-black/20 backdrop-blur-xl border-b border-white/10 shrink-0 z-20"> 
                    <button onClick={handleSave} className="p-3 rounded-[1.2rem] bg-white/5 hover:bg-black/40 text-white transition-all active:scale-90 border border-white/5"> 
                        <ArrowLeftIcon className="w-7 h-7"/> 
                    </button> 
                    <div className="flex items-center gap-3"> 
                        <button onClick={() => setNote(prev => ({ ...prev, is_pinned: !prev.is_pinned }))} className={`p-3 rounded-[1.2rem] transition-all active:scale-90 border ${note.is_pinned ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-900/40' : 'bg-white/5 text-white/40 border-white/5'}`} title={note.is_pinned ? "إلغاء التثبيت" : "تثبيت"}> 
                            {note.is_pinned ? <SolidPinIcon className="w-6 h-6" /> : <PinIcon className="w-6 h-6" />} 
                        </button> 
                        <ColorPickerPopover currentColor={note.color} onSelect={(color) => setNote(prev => ({ ...prev, color }))}> 
                            <PaintBrushIcon className="w-6 h-6 text-white/70" /> 
                        </ColorPickerPopover> 
                        <button 
                            onClick={handleSave}
                            className="px-8 py-3 rounded-[1.2rem] bg-white text-black font-black text-sm hover:bg-cyan-50 transition-all active:scale-95 border border-white/10 shadow-xl"
                        > 
                            حفظ
                        </button> 
                    </div> 
                </div> 

                <div className="flex-grow flex flex-col overflow-y-auto custom-scrollbar relative z-10"> 
                    <div className="max-w-3xl mx-auto w-full px-8 py-10"> 
                        <textarea 
                            ref={titleRef} 
                            placeholder="عنوان الملاحظة..." 
                            className="w-full bg-transparent text-4xl sm:text-5xl font-black text-white placeholder-white/20 focus:outline-none resize-none mb-8 leading-tight tracking-tight" 
                            rows={1} 
                            onInput={handleTitleInput} 
                        /> 
                        <div 
                            id="rich-text-editor" 
                            ref={contentRef} 
                            contentEditable 
                            suppressContentEditableWarning 
                            className="outline-none prose prose-invert prose-xl max-w-none text-slate-100/90 empty:before:content-[attr(data-placeholder)] empty:before:text-white/20 min-h-[300px] font-medium" 
                            data-placeholder="ابدأ بكتابة أفكارك هنا..." 
                            onInput={updateStats} 
                        /> 
                    </div> 
                </div> 

                <div className="bg-slate-900/95 backdrop-blur-3xl border-t border-white/10 p-4 pb-safe shrink-0"> 
                    <div className="max-w-4xl mx-auto flex flex-col gap-4"> 
                        <EditorToolbar /> 
                        <div className="flex justify-between items-center px-4 text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]"> 
                            <span className="flex items-center gap-2"><SparklesIcon className="w-3 h-3"/> {wordCount} كلمة</span> 
                            <span className="flex items-center gap-1.5"> 
                                <CalendarDaysIcon className="w-4 h-4 text-slate-600"/> 
                                {note.updated_at ? new Date(note.updated_at).toLocaleString('ar-LY') : 'الآن'} 
                            </span> 
                        </div> 
                    </div> 
                </div> 
            </div> 
        </div> 
    ); 
};

export default NotesPage;