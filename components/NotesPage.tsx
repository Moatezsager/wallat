
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
    Heading1Icon, Heading2Icon, CheckSquareIcon, CalendarDaysIcon, PencilSquareIcon
} from './icons';

// ... (Keep existing constants and helper functions: NOTE_THEMES, useClickOutside, formatDoc, insertCheckbox, EditorToolbar, ColorPickerPopover)
const NOTE_THEMES = [ { id: 'zinc', bg: '#27272a', border: '#3f3f46' }, { id: 'red', bg: '#450a0a', border: '#7f1d1d' }, { id: 'orange', bg: '#431407', border: '#7c2d12' }, { id: 'amber', bg: '#451a03', border: '#78350f' }, { id: 'emerald', bg: '#022c22', border: '#064e3b' }, { id: 'teal', bg: '#042f2e', border: '#134e4a' }, { id: 'cyan', bg: '#083344', border: '#164e63' }, { id: 'blue', bg: '#172554', border: '#1e3a8a' }, { id: 'indigo', bg: '#1e1b4b', border: '#312e81' }, { id: 'violet', bg: '#2e1065', border: '#4c1d95' }, { id: 'fuchsia', bg: '#4a044e', border: '#831843' }, { id: 'rose', bg: '#4c0519', border: '#881337' }, ];
const useClickOutside = (ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void, active: boolean) => { useEffect(() => { if (!active) return; const listener = (event: MouseEvent | TouchEvent) => { if (!ref.current || ref.current.contains(event.target as Node)) { return; } handler(event); }; document.addEventListener('mousedown', listener); document.addEventListener('touchstart', listener); return () => { document.removeEventListener('mousedown', listener); document.removeEventListener('touchstart', listener); }; }, [ref, handler, active]); };
const formatDoc = (cmd: string, value: string | null = null) => { document.execCommand(cmd, false, value); const editor = document.getElementById('rich-text-editor'); if(editor) editor.focus(); };
const insertCheckbox = () => { const html = '<ul class="checklist"><li><input type="checkbox"> </li></ul>'; document.execCommand('insertHTML', false, html); }
const EditorToolbar: React.FC = () => { const groups = [ [ { cmd: 'undo', icon: UndoIcon, title: 'تراجع' }, { cmd: 'redo', icon: RedoIcon, title: 'إعادة' }, ], [ { cmd: 'formatBlock', value: 'H2', icon: Heading1Icon, title: 'عنوان كبير' }, { cmd: 'formatBlock', value: 'H3', icon: Heading2Icon, title: 'عنوان متوسط' }, ], [ { cmd: 'bold', icon: BoldIcon, title: 'عريض' }, { cmd: 'italic', icon: ItalicIcon, title: 'مائل' }, { cmd: 'underline', icon: UnderlineIcon, title: 'تحته خط' }, { cmd: 'strikeThrough', icon: StrikethroughIcon, title: 'يتوسطه خط' }, ], [ { cmd: 'justifyLeft', icon: AlignLeftIcon, title: 'يسار' }, { cmd: 'justifyCenter', icon: AlignCenterIcon, title: 'وسط' }, { cmd: 'justifyRight', icon: AlignRightIcon, title: 'يمين' }, ], [ { cmd: 'insertUnorderedList', icon: ListBulletIcon, title: 'قائمة نقطية' }, { cmd: 'insertOrderedList', icon: QueueListIcon, title: 'قائمة رقمية' }, { action: insertCheckbox, icon: CheckSquareIcon, title: 'قائمة مهام' }, ], [ { cmd: 'formatBlock', value: 'BLOCKQUOTE', icon: ChatBubbleLeftQuoteIcon, title: 'اقتباس' }, ] ]; return ( <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 px-1"> {groups.map((group, idx) => ( <div key={idx} className="flex items-center gap-0.5 bg-slate-800/50 rounded-lg p-1 border border-white/5"> {group.map((btn: any) => ( <button key={btn.title} type="button" onMouseDown={e => { e.preventDefault(); if (btn.action) btn.action(); else formatDoc(btn.cmd, btn.value || null); }} title={btn.title} className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors" > <btn.icon className="w-4 h-4" /> </button> ))} </div> ))} </div> ); };
const ColorPickerPopover: React.FC<{ onSelect: (color: string) => void; currentColor: string; children: React.ReactNode; }> = ({ onSelect, currentColor, children }) => { const [isOpen, setIsOpen] = useState(false); const popoverRef = useRef<HTMLDivElement>(null); useClickOutside(popoverRef, () => setIsOpen(false), isOpen); return ( <div ref={popoverRef} className="relative"> <button type="button" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-2 rounded-full hover:bg-black/20 transition-colors"> {children} </button> {isOpen && ( <div className="absolute bottom-full left-0 mb-3 bg-slate-900/95 backdrop-blur-xl p-3 rounded-2xl grid grid-cols-4 gap-2 border border-slate-700 shadow-2xl animate-fade-in z-20 w-48"> {NOTE_THEMES.map(theme => ( <button key={theme.id} type="button" style={{ backgroundColor: theme.bg, borderColor: theme.border }} onClick={(e) => { e.stopPropagation(); onSelect(theme.bg); setIsOpen(false); }} className={`w-8 h-8 rounded-full transition-transform hover:scale-110 border-2 ${currentColor === theme.bg ? 'ring-2 ring-white scale-110' : ''}`} /> ))} </div> )} </div> ); };

// --- Main Page Component ---
const NotesPage: React.FC<{ refreshTrigger: number; handleDatabaseChange: (description?: string) => void; }> = ({ refreshTrigger, handleDatabaseChange }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const toast = useToast();
    const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
    
    // Updated state to handle modes
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
        // Optimistic update
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...updates } : n));
        
        const { error } = await supabase.from('notes').update({...updates, updated_at: new Date().toISOString()}).eq('id', noteId);
        if (error) {
             console.error("Error updating note:", error.message);
             fetchNotes(); // Revert on error
        } else {
            // Quiet update without toast for simple interactions like pinning
            handleDatabaseChange(); 
        }
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Search Bar */}
            <div className="sticky top-20 z-10 mx-auto max-w-2xl">
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all opacity-50"></div>
                    <div className="relative bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl overflow-hidden flex items-center p-1">
                        <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 mx-3" />
                        <input
                            type="text"
                            placeholder="ابحث في أفكارك..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent py-3 text-white placeholder-slate-500 focus:outline-none font-medium"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
                    {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-800/50 rounded-2xl"></div>)}
                </div>
            ) : notes.length === 0 && !searchTerm ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] flex items-center justify-center shadow-inner border border-white/5">
                        <ClipboardDocumentIcon className="w-10 h-10 text-slate-600"/>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">مساحتك الخاصة</h3>
                        <p className="text-slate-400 max-w-xs mx-auto">سجل أفكارك، مهامك، أو أي شيء تريد تذكره. كل شيء يبدأ بملاحظة.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-fade-in">
                    {pinnedNotes.length > 0 && (
                        <NotesSection 
                            title="المثبتة"
                            icon={<SolidPinIcon className="w-4 h-4 text-cyan-400" />}
                            notes={pinnedNotes}
                            // Change: Click opens view mode
                            onClick={(note) => setEditorState({ mode: 'viewing', note })}
                            onDelete={confirmDelete}
                            onUpdateField={handleUpdateNoteField}
                        />
                    )}
                    {otherNotes.length > 0 && (
                         <NotesSection 
                            title={pinnedNotes.length > 0 ? "أخرى" : undefined}
                            notes={otherNotes}
                            // Change: Click opens view mode
                            onClick={(note) => setEditorState({ mode: 'viewing', note })}
                            onDelete={confirmDelete}
                            onUpdateField={handleUpdateNoteField}
                        />
                    )}
                    {filteredNotes.length === 0 && searchTerm && (
                        <div className="text-center py-12">
                            <p className="text-slate-500">لم يتم العثور على ملاحظات تطابق "<span className="text-white">{searchTerm}</span>"</p>
                        </div>
                    )}
                </div>
            )}

            {/* Centered FAB */}
            <button 
                onClick={() => setEditorState({ mode: 'adding', note: null })} 
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 h-16 w-16 bg-slate-900 rounded-full shadow-[0_0_20px_rgba(8,145,178,0.4)] flex items-center justify-center transition-all duration-300 border-4 border-slate-900 overflow-visible hover:scale-105 active:scale-95 group"
            >
                <div className="absolute inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <PlusIcon className="w-8 h-8 text-white transition-transform duration-300 group-hover:rotate-90"/>
                </div>
            </button>

            <ConfirmDialog 
                isOpen={!!noteToDelete}
                title="حذف الملاحظة"
                message="هل أنت متأكد من رغبتك في حذف هذه الملاحظة نهائياً؟"
                confirmText="حذف"
                onConfirm={handleDeleteNote}
                onCancel={() => setNoteToDelete(null)}
            />

            {/* Render Viewer or Editor based on state */}
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

// ... (Keep existing sub-components: NotesSection, NoteCard, NoteViewerModal, NoteEditorModal unchanged)
const NotesSection: React.FC<{ title?: string; icon?: React.ReactNode; notes: Note[]; onClick: (note: Note) => void; onDelete: (id: string) => void; onUpdateField: (id: string, updates: Partial<Note>) => void; }> = ({ title, icon, notes, onClick, onDelete, onUpdateField }) => ( <div> {title && ( <h2 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2"> {icon} {title} </h2> )} <div className="masonry-grid"> {notes.map(note => ( <NoteCard key={note.id} note={note} onClick={() => onClick(note)} onDelete={() => onDelete(note.id)} onUpdateField={(updates) => onUpdateField(note.id, updates)} /> ))} </div> </div> );
const NoteCard: React.FC<{ note: Note; onClick: () => void; onDelete: () => void; onUpdateField: (updates: Partial<Note>) => void; }> = ({ note, onClick, onDelete, onUpdateField }) => { const [title, content] = useMemo(() => { const tempDiv = document.createElement('div'); tempDiv.innerHTML = note.note_text; const heading = tempDiv.querySelector('h1, h2'); let titleText = ''; if (heading) { titleText = heading.textContent || ''; heading.remove(); } const contentHtml = tempDiv.innerHTML; const cleanContent = contentHtml.replace(/<p><br><\/p>/g, '').trim(); return [titleText, cleanContent]; }, [note.note_text]); return ( <div className="masonry-item group perspective-1000"> <div onClick={onClick} className="relative rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50 border border-white/5" style={{ backgroundColor: note.color }} > <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div> <div className="p-5 pb-14 min-h-[120px]"> {note.is_pinned && <span className="absolute top-4 right-4 text-white/50"><SolidPinIcon className="w-4 h-4" /></span>} {title ? ( <h3 className="font-bold text-lg text-white mb-2 leading-snug">{title}</h3> ) : null} <div className="text-slate-300/90 text-sm leading-relaxed line-clamp-6 prose prose-invert prose-sm max-w-none break-words" dangerouslySetInnerHTML={{ __html: content || (title ? '' : '<span class="italic opacity-50">ملاحظة فارغة</span>') }} /> </div> <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/40 via-black/20 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0"> <span className="text-[10px] text-white/50 px-2 font-mono"> {new Date(note.updated_at).toLocaleDateString('ar-LY', {month:'short', day:'numeric'})} </span> <div className="flex gap-1"> <button type="button" onClick={(e) => { e.stopPropagation(); onUpdateField({ is_pinned: !note.is_pinned }); }} className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"> <PinIcon className="w-4 h-4"/> </button> <ColorPickerPopover currentColor={note.color} onSelect={(color) => onUpdateField({ color })}> <PaintBrushIcon className="w-4 h-4 text-white/80" /> </ColorPickerPopover> <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 rounded-full hover:bg-rose-500/20 text-white/80 hover:text-rose-400 transition-colors"> <TrashIcon className="w-4 h-4"/> </button> </div> </div> </div> </div> ); };
const NoteViewerModal: React.FC<{ note: Note; onClose: () => void; onEdit: () => void; onDelete: (id: string) => void; }> = ({ note, onClose, onEdit, onDelete }) => { const contentRef = useRef<HTMLDivElement>(null); const [wordCount, setWordCount] = useState(0); const [copied, setCopied] = useState(false); const [title, content] = useMemo(() => { const tempDiv = document.createElement('div'); tempDiv.innerHTML = note.note_text; const heading = tempDiv.querySelector('h1'); let titleText = ''; if (heading) { titleText = heading.textContent || ''; heading.remove(); } return [titleText, tempDiv.innerHTML]; }, [note.note_text]); useEffect(() => { if (contentRef.current) { const text = contentRef.current.innerText || ""; setWordCount(text.trim().split(/\s+/).filter(w => w.length > 0).length); } }, [note.note_text]); const handleCopy = () => { const tempDiv = document.createElement('div'); tempDiv.innerHTML = note.note_text; const text = tempDiv.innerText || tempDiv.textContent || ''; navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }; return ( <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-fade-in"> <div className="w-full h-full flex flex-col sm:max-w-3xl sm:h-[85vh] sm:rounded-[2rem] shadow-2xl transition-colors duration-500 relative overflow-hidden" style={{ backgroundColor: note.color }} > <div className="flex justify-between items-center p-4 bg-black/10 backdrop-blur-md border-b border-white/5 shrink-0 z-10"> <button onClick={onClose} className="p-2 rounded-full hover:bg-black/20 text-white transition-colors"> <ArrowLeftIcon className="w-6 h-6"/> </button> <div className="flex items-center gap-3"> <span className="text-[10px] text-white/50 font-mono hidden sm:inline-block"> {new Date(note.updated_at).toLocaleString('ar-LY')} </span> <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div> <button onClick={handleCopy} className="p-2 rounded-full hover:bg-black/20 text-white/80 hover:text-white transition flex items-center gap-1" title="نسخ النص"> {copied ? <CheckSquareIcon className="w-5 h-5 text-emerald-300"/> : <CopyIcon className="w-5 h-5"/>} </button> <button onClick={onEdit} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 shadow-sm" title="تعديل"> <PencilSquareIcon className="w-5 h-5"/> </button> </div> </div> <div className="flex-grow flex flex-col overflow-y-auto custom-scrollbar relative"> <div className="max-w-2xl mx-auto w-full px-6 py-10"> {title && ( <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6 leading-tight border-b border-white/5 pb-4"> {title} </h1> )} <div ref={contentRef} className="prose prose-invert prose-lg max-w-none text-slate-100/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} /> </div> </div> <div className="bg-slate-900/50 backdrop-blur-xl border-t border-white/10 p-3 pb-safe shrink-0 flex justify-between items-center px-6"> <span className="text-xs text-white/40">{wordCount} كلمة</span> <button onClick={() => onDelete(note.id)} className="p-2 -mr-2 rounded-full hover:bg-rose-500/10 text-white/30 hover:text-rose-400 transition"> <TrashIcon className="w-4 h-4"/> </button> </div> </div> </div> ); };
const NoteEditorModal: React.FC<{ note: Note | null; onSave: (note: Note | Omit<Note, 'id' | 'created_at' | 'updated_at'>) => void; onDelete: (id: string) => void; onCancel: () => void; }> = ({ note: initialNote, onSave, onDelete, onCancel }) => { const defaultNewNote = useMemo(() => ({ note_text: '', color: NOTE_THEMES[0].bg, is_pinned: false, is_code: false, language: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }), []); const [note, setNote] = useState(initialNote || defaultNewNote); const contentRef = useRef<HTMLDivElement>(null); const titleRef = useRef<HTMLTextAreaElement>(null); const [wordCount, setWordCount] = useState(0); useEffect(() => { if (!initialNote) return; const tempDiv = document.createElement('div'); tempDiv.innerHTML = initialNote.note_text; const heading = tempDiv.querySelector('h1'); if (heading && titleRef.current) { titleRef.current.value = heading.textContent || ''; heading.remove(); } if (contentRef.current) { contentRef.current.innerHTML = tempDiv.innerHTML; } updateStats(); }, []); const updateStats = () => { if (contentRef.current) { const text = contentRef.current.innerText || ""; setWordCount(text.trim().split(/\s+/).filter(w => w.length > 0).length); } }; const handleSave = useCallback(() => { const newTitle = titleRef.current?.value.trim() || ''; const newContent = contentRef.current?.innerHTML.trim() || ''; if (!initialNote && !newTitle && !newContent) { onCancel(); return; } const newNoteText = newTitle ? `<h1>${newTitle}</h1>${newContent}` : newContent; onSave({ ...note, note_text: newNoteText }); }, [initialNote, note, onSave, onCancel]); const handleCopy = () => { const text = `${titleRef.current?.value || ''}\n${contentRef.current?.innerText || ''}`; navigator.clipboard.writeText(text); }; const modalRef = useRef<HTMLDivElement>(null); const handleTitleInput = (e: React.FormEvent<HTMLTextAreaElement>) => { const target = e.currentTarget; target.style.height = 'auto'; target.style.height = `${target.scrollHeight}px`; }; return ( <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-fade-in"> <div ref={modalRef} className="w-full h-full flex flex-col sm:max-w-3xl sm:h-[85vh] sm:rounded-[2rem] shadow-2xl transition-colors duration-500 relative overflow-hidden" style={{ backgroundColor: note.color }} > <div className="flex justify-between items-center p-4 bg-black/10 backdrop-blur-md border-b border-white/5 shrink-0 z-10"> <button onClick={handleSave} className="p-2 rounded-full hover:bg-black/20 text-white transition-colors flex items-center gap-2"> <ArrowLeftIcon className="w-6 h-6"/> </button> <div className="flex items-center gap-2"> <button onClick={handleCopy} className="p-2 rounded-full hover:bg-black/20 text-white/80 hover:text-white transition" title="نسخ النص"> <CopyIcon className="w-5 h-5"/> </button> <button onClick={() => setNote(prev => ({ ...prev, is_pinned: !prev.is_pinned }))} className={`p-2 rounded-full hover:bg-black/20 transition ${note.is_pinned ? 'text-white' : 'text-white/50'}`} title={note.is_pinned ? "إلغاء التثبيت" : "تثبيت"}> {note.is_pinned ? <SolidPinIcon className="w-5 h-5" /> : <PinIcon className="w-5 h-5" />} </button> <ColorPickerPopover currentColor={note.color} onSelect={(color) => setNote(prev => ({ ...prev, color }))}> <PaintBrushIcon className="w-5 h-5 text-white/80" /> </ColorPickerPopover> {initialNote && ( <button onClick={() => onDelete(initialNote.id)} className="p-2 rounded-full hover:bg-rose-500/20 text-white/80 hover:text-rose-400 transition" title="حذف"> <TrashIcon className="w-5 h-5"/> </button> )} </div> </div> <div className="flex-grow flex flex-col overflow-y-auto custom-scrollbar relative"> <div className="max-w-2xl mx-auto w-full px-6 py-8"> <textarea ref={titleRef} placeholder="العنوان" className="w-full bg-transparent text-3xl font-bold text-white placeholder-white/40 focus:outline-none resize-none mb-4 leading-tight" rows={1} onInput={handleTitleInput} /> <div id="rich-text-editor" ref={contentRef} contentEditable suppressContentEditableWarning className="outline-none prose prose-invert prose-lg max-w-none text-slate-100/90 empty:before:content-[attr(data-placeholder)] empty:before:text-white/30 min-h-[200px]" data-placeholder="ابدأ الكتابة..." onInput={updateStats} /> </div> </div> <div className="bg-slate-900/90 backdrop-blur-xl border-t border-white/10 p-2 pb-safe shrink-0"> <div className="max-w-2xl mx-auto flex flex-col gap-2"> <EditorToolbar /> <div className="flex justify-between items-center px-2 text-[10px] text-slate-500 font-mono"> <span>{wordCount} كلمة</span> <span className="flex items-center gap-1"> <CalendarDaysIcon className="w-3 h-3"/> {note.updated_at ? new Date(note.updated_at).toLocaleString('ar-LY') : 'الآن'} </span> </div> </div> </div> </div> </div> ); };

export default NotesPage;
