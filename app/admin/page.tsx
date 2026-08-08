'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { QuizFormModal, EditQuizModal } from '@/components/admin/QuizModals';
import AccessTypeSelect from '@/components/admin/AccessTypeSelect';
import QuestionBankSection from '@/components/admin/QuestionBankSection';
import GenerateQuizModal from '@/components/admin/GenerateQuizModal';
import { CLASS_OPTIONS, getClassByKey } from '@/lib/classes';
import {
  Video,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Save,
  ArrowRight,
  KeyRound,
  Copy,
  FileText,
  ClipboardList,
  Users,
  Download,
  Lightbulb,
  GripVertical,
  Database,
  Sparkles,
  Bell,
  Send,
} from 'lucide-react';
import * as XLSX from 'xlsx';


interface Lesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  grade?: string | null;
  order: number;
  type?: string;
  accessType?: string;
  summary?: string | null;
  keyPoints?: string[] | string;
  files?: { title: string; url: string; type?: string }[] | string;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  icon: string;
  grade?: string | null;
  order: number;
  lessons: Lesson[];
  pdfs?: Pdf[];
}

interface Pdf {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  order: number;
  category?: string;
  accessType?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [subscriptionCodes, setSubscriptionCodes] = useState<any[]>([]);
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [codeForm, setCodeForm] = useState({ plan: 'monthly', durationDays: '30' });
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'content' | 'users' | 'pdfs' | 'quizzes' | 'questionBank' | 'advice' | 'settings'>('content');
  const [classFilter, setClassFilter] = useState<string>('');

  const [topicForm, setTopicForm] = useState({
    title: '',
    description: '',
    icon: 'BookOpen',
    grade: '',
  });

  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    duration: '10:00',
    type: 'explanation',
    accessType: 'FREE',
    summary: '',
    keyPoints: '',
    files: '',
    grade: '',
  });

  const [pdfForm, setPdfForm] = useState({
    title: '',
    description: '',
    fileUrl: '',
    category: 'explanation',
    accessType: 'FREE',
    grade: '',
  });
  const [showPdfForm, setShowPdfForm] = useState(false);
  const [editingPdf, setEditingPdf] = useState<any>(null);
  const [allPdfs, setAllPdfs] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [showGenerateQuiz, setShowGenerateQuiz] = useState(false);

  const [advice, setAdvice] = useState<any[]>([]);
  const [showAdviceForm, setShowAdviceForm] = useState(false);
  const [editingAdvice, setEditingAdvice] = useState<any>(null);
  const [adviceForm, setAdviceForm] = useState({
    title: '',
    content: '',
    videoUrl: '',
    type: 'text',
    grade: '',
  });

  const [draggedPdf, setDraggedPdf] = useState<any>(null);
  const [pdfsOrder, setPdfsOrder] = useState<{ [key: string]: any[] }>({});

  useEffect(() => {
    if (!authLoading && !user?.isAdmin) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchTopics();
      fetchSubscriptionCodes();
      fetchUsers();
      fetchPdfs();
    }
  }, [user]);

  const fetchSubscriptionCodes = async () => {
    try {
      const res = await fetch('/api/admin/subscription-codes');
      const data = await res.json();
      if (data.success) {
        setSubscriptionCodes(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch codes:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchPdfs = async () => {
    try {
      const res = await fetch('/api/admin/pdfs');
      const data = await res.json();
      if (data.success) {
        setAllPdfs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch PDFs:', error);
    }
  };

  const handleDeletePdf = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الملف؟')) return;
    try {
      const res = await fetch(`/api/admin/pdfs?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchPdfs();
      }
    } catch (error) {
      console.error('Failed to delete PDF:', error);
    }
  };

  const exportUsersToExcel = () => {
    const worksheetData = users.map((u: any) => ({
      'الاسم': u.name || '',
      'البريد الإلكتروني': u.email || '',
      'رقم الهاتف': u.phone || '',
      'مشترك': u.isSubscribed ? 'نعم' : 'لا',
      'مدير': u.isAdmin ? 'نعم' : 'لا',
      'تاريخ التسجيل': u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '',
      'تاريخ انتهاء الاشتراك': u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toLocaleDateString('ar-EG') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المستخدمين');
    XLSX.writeFile(wb, 'المستخدمين.xlsx');
  };

  const handleCreateCode = async () => {
    try {
      const res = await fetch('/api/admin/subscription-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: codeForm.plan,
          durationDays: parseInt(codeForm.durationDays, 10),
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchSubscriptionCodes();
        setShowCodeForm(false);
        setCodeForm({ plan: 'monthly', durationDays: '30' });
      } else {
        alert(data.error || 'حدث خطأ في إنشاء الكود');
      }
    } catch (error) {
      console.error('Failed to create code:', error);
      alert('حدث خطأ في إنشاء الكود');
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكود؟')) return;
    try {
      const res = await fetch('/api/admin/subscription-codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchSubscriptionCodes();
      }
    } catch (error) {
      console.error('Failed to delete code:', error);
    }
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/admin/topics');
      const data = await res.json();
      if (data.success) {
        setTopics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTopic = async () => {
    if (!topicForm.title) {
      alert('يرجى إدخال عنوان الموضوع');
      return;
    }
    try {
      console.log('Creating topic with data:', topicForm);
      const res = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(topicForm),
      });
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);
      if (data.success) {
        fetchTopics();
        setShowTopicForm(false);
        setTopicForm({ title: '', description: '', icon: 'BookOpen', grade: '' });
      } else {
        alert(data.error || 'فشل في إنشاء الموضوع');
      }
    } catch (error) {
      console.error('Failed to create topic:', error);
      alert('فشل في إنشاء الموضوع');
    }
  };

  const handleUpdateTopic = async () => {
    if (!editingTopic) return;
    try {
      const res = await fetch(`/api/admin/topics/${editingTopic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTopic),
      });
      const data = await res.json();
      if (data.success) {
        fetchTopics();
        setEditingTopic(null);
      }
    } catch (error) {
      console.error('Failed to update topic:', error);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموضوع؟')) return;
    try {
      const res = await fetch(`/api/admin/topics/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTopics();
      }
    } catch (error) {
      console.error('Failed to delete topic:', error);
    }
  };

  const handleCreateLesson = async () => {
    if (!selectedTopicId) return;
    try {
      const payload = {
        ...lessonForm,
        summary: lessonForm.summary || null,
        keyPoints: lessonForm.keyPoints
          ? lessonForm.keyPoints.split('\n').map((s: string) => s.trim()).filter(Boolean)
          : [],
        files: lessonForm.files
          ? lessonForm.files
              .split('\n')
              .map((line: string) => line.trim())
              .filter(Boolean)
              .map((line: string) => {
                const sep = line.includes('|') ? line.indexOf('|') : line.lastIndexOf(' ');
                if (sep === -1) return { title: line, url: line };
                return { title: line.slice(0, sep).trim(), url: line.slice(sep + 1).trim() };
              })
          : [],
        topicId: selectedTopicId,
      };
      const res = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        fetchTopics();
        setShowLessonForm(false);
        setLessonForm({ title: '', description: '', videoUrl: '', duration: '10:00', type: 'explanation', accessType: 'FREE', summary: '', keyPoints: '', files: '', grade: '' });
      }
    } catch (error) {
      console.error('Failed to create lesson:', error);
    }
  };

  const handleUpdateLesson = async () => {
    if (!editingLesson) return;
    try {
      const payload = {
        ...editingLesson,
        summary: editingLesson.summary || null,
        keyPoints:
          typeof editingLesson.keyPoints === 'string'
            ? editingLesson.keyPoints.split('\n').map((s: string) => s.trim()).filter(Boolean)
            : editingLesson.keyPoints,
        files:
          typeof editingLesson.files === 'string'
            ? editingLesson.files
                .split('\n')
                .map((line: string) => line.trim())
                .filter(Boolean)
                .map((line: string) => {
                  const sep = line.includes('|') ? line.indexOf('|') : line.lastIndexOf(' ');
                  if (sep === -1) return { title: line, url: line };
                  return { title: line.slice(0, sep).trim(), url: line.slice(sep + 1).trim() };
                })
            : editingLesson.files,
      };
      const res = await fetch(`/api/admin/lessons/${editingLesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        fetchTopics();
        setEditingLesson(null);
      }
    } catch (error) {
      console.error('Failed to update lesson:', error);
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدرس؟')) return;
    try {
      const res = await fetch(`/api/admin/lessons/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTopics();
      }
    } catch (error) {
      console.error('Failed to delete lesson:', error);
    }
  };

const handleCreatePdf = async () => {
      if (!pdfForm.title) {
        alert('يرجى إدخال عنوان الملف');
        return;
      }
      if (!pdfForm.fileUrl) {
        alert('يرجى إدخال رابط الملف');
        return;
      }
      try {
        const res = await fetch('/api/admin/pdfs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...pdfForm }),
        });
        const data = await res.json();
        if (data.success) {
          fetchTopics();
          setShowPdfForm(false);
          setPdfForm({ title: '', description: '', fileUrl: '', category: 'explanation', accessType: 'FREE', grade: '' });
          alert('تم إنشاء الملف بنجاح');
        } else {
          alert(data.error || 'فشل في إنشاء الملف');
        }
      } catch (error) {
        console.error('Failed to create pdf:', error);
        alert('فشل في إنشاء الملف');
      }
    };

const handleUpdatePdf = async () => {
      if (!editingPdf) return;
      try {
        const res = await fetch(`/api/admin/pdfs/${editingPdf.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingPdf),
        });
        const data = await res.json();
        if (data.success) {
          fetchTopics();
          setEditingPdf(null);
        } else {
          alert(data.error || 'فشل في تحديث الملف');
        }
      } catch (error) {
        console.error('Failed to update pdf:', error);
        alert('فشل في تحديث الملف');
      }
    };

    const handleReorderPdfs = async (topicId: string, pdfs: any[]) => {
      try {
        for (let i = 0; i < pdfs.length; i++) {
          await fetch(`/api/admin/pdfs/${pdfs[i].id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: i }),
          });
        }
        fetchTopics();
      } catch (error) {
        console.error('Failed to reorder pdfs:', error);
      }
    };

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('يرجى اختيار ملف PDF فقط');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setPdfForm({ ...pdfForm, fileUrl: data.data.url });
      } else {
        alert('فشل رفع الملف');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('فشل رفع الملف');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchTopics();
      fetchSubscriptionCodes();
      fetchQuizzes();
    }
  }, [user]);

  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/admin/quizzes');
      const data = await res.json();
      if (data.success) {
        setQuizzes(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    }
  };

  const handleCreateQuiz = async (quizData: any) => {
    try {
      const res = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData),
      });
      const data = await res.json();
      if (data.success) {
        fetchQuizzes();
      }
    } catch (error) {
      console.error('Failed to create quiz:', error);
    }
  };

  const handleUpdateQuiz = async (quizData: any) => {
    try {
      const res = await fetch(`/api/admin/quizzes/${quizData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData),
      });
      const data = await res.json();
      if (data.success) {
        fetchQuizzes();
      }
    } catch (error) {
      console.error('Failed to update quiz:', error);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاختبار؟')) return;
    try {
      const res = await fetch(`/api/admin/quizzes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchQuizzes();
      }
    } catch (error) {
      console.error('Failed to delete quiz:', error);
    }
  };

  const fetchAdvice = async () => {
    try {
      const res = await fetch('/api/admin/advice');
      const data = await res.json();
      if (data.success) {
        setAdvice(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch advice:', error);
    }
  };

  const handleCreateAdvice = async () => {
    if (!adviceForm.title) {
      alert('يرجى إدخال العنوان');
      return;
    }
    try {
      const res = await fetch('/api/admin/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adviceForm),
      });
      const data = await res.json();
      if (data.success) {
        fetchAdvice();
        setShowAdviceForm(false);
        setAdviceForm({ title: '', content: '', videoUrl: '', type: 'text', grade: '' });
      } else {
        alert(data.error || 'فشل في إنشاء النصيحة');
      }
    } catch (error) {
      console.error('Failed to create advice:', error);
    }
  };

  const handleUpdateAdvice = async () => {
    if (!editingAdvice) return;
    try {
      const res = await fetch(`/api/admin/advice/${editingAdvice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAdvice),
      });
      const data = await res.json();
      if (data.success) {
        fetchAdvice();
        setEditingAdvice(null);
      } else {
        alert(data.error || 'فشل في تحديث النصيحة');
      }
    } catch (error) {
      console.error('Failed to update advice:', error);
    }
  };

  const handleDeleteAdvice = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه النصيحة؟')) return;
    try {
      const res = await fetch(`/api/admin/advice/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAdvice();
      }
    } catch (error) {
      console.error('Failed to delete advice:', error);
    }
  };

  function SettingsTab() {
    const [settings, setSettings] = useState({ landingVideoUrl: 'k3sRZvSlBNE' });
    const [saving, setSaving] = useState(false);
    const [settingsMessage, setSettingsMessage] = useState('');
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementMessage, setAnnouncementMessage] = useState('');
    const [announcementGrade, setAnnouncementGrade] = useState('');
    const [announcementTarget, setAnnouncementTarget] = useState<'all' | 'grade' | 'subscribers' | 'custom'>('all');
    const [announcementSelectedUsers, setAnnouncementSelectedUsers] = useState<string[]>([]);
    const [announcementStatus, setAnnouncementStatus] = useState('');
    const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

    const sendAnnouncement = async () => {
      setSendingAnnouncement(true);
      setAnnouncementStatus('');
      try {
        const res = await fetch('/api/admin/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: announcementTitle.trim(),
            message: announcementMessage.trim(),
            targetType: announcementTarget,
            grade: announcementGrade || null,
            targetUserIds: announcementTarget === 'custom' ? announcementSelectedUsers : [],
          }),
        });
        const data = await res.json();
        if (data.success) {
          setAnnouncementStatus('تم الإرسال بنجاح');
          setAnnouncementTitle('');
          setAnnouncementMessage('');
          setAnnouncementGrade('');
          setAnnouncementSelectedUsers([]);
        } else {
          setAnnouncementStatus(data.error ?? 'فشل الإرسال');
        }
      } catch {
        setAnnouncementStatus('فشل الإرسال');
      } finally {
        setSendingAnnouncement(false);
        setTimeout(() => setAnnouncementStatus(''), 3000);
      }
    };

    useEffect(() => {
      fetch('/api/admin/settings').then(r => r.json()).then(data => {
        if (data.success) setSettings(data.data);
      }).catch(() => {});
    }, []);

    const saveSettings = async () => {
      setSaving(true);
      setSettingsMessage('');
      try {
        const res = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });
        const data = await res.json();
        if (data.success) {
          setSettingsMessage('تم حفظ الإعدادات بنجاح');
        } else {
          setSettingsMessage('فشل حفظ الإعدادات');
        }
      } catch {
        setSettingsMessage('فشل حفظ الإعدادات');
      } finally {
        setSaving(false);
        setTimeout(() => setSettingsMessage(''), 3000);
      }
    };

    return (
      <>
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            إعدادات المنصة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">رابط فيديو اليوتيوب الرئيسي (الصفحة الرئيسية)</label>
            <Input
              value={settings.landingVideoUrl}
              onChange={(e) => setSettings({ ...settings, landingVideoUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
          {settingsMessage && (
            <div className={`text-sm rounded-lg p-3 ${settingsMessage.includes('نجاح') ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
              {settingsMessage}
            </div>
          )}
          <Button onClick={saveSettings} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                حفظ الإعدادات
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            إرسال إعلان للطلاب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">عنوان الإعلان</label>
            <Input
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              placeholder="مثال: موعد الاختبار الشهري"
              className="bg-card border-border text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">نص الإعلان</label>
            <textarea
              value={announcementMessage}
              onChange={(e) => setAnnouncementMessage(e.target.value)}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground min-h-[80px]"
              placeholder="اكتب تفاصيل الإعلان..."
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">الفئة المستهدفة</label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                { value: 'all' as const, label: 'كل الطلاب' },
                { value: 'grade' as const, label: 'صف معين' },
                { value: 'subscribers' as const, label: 'المشتركين فقط' },
                { value: 'custom' as const, label: 'مجموعة معينة' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setAnnouncementTarget(opt.value);
                    if (opt.value !== 'custom') setAnnouncementSelectedUsers([]);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    announcementTarget === opt.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-card border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {(announcementTarget === 'grade' || announcementTarget === 'subscribers') && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                {announcementTarget === 'subscribers'
                  ? 'صف معين من المشتركين؟ (اختياري)'
                  : 'اختر الصف'}
              </label>
              <select
                value={announcementGrade}
                onChange={(e) => setAnnouncementGrade(e.target.value)}
                className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
              >
                <option value="">
                  {announcementTarget === 'subscribers' ? 'كل المشتركين' : 'اختر الصف...'}
                </option>
                <option value="third_preparatory">الصف الثالث الاعدادي</option>
                <option value="first_secondary">الصف الأول الثانوي</option>
                <option value="second_secondary">الصف الثاني الثانوي (بكالوريا)</option>
                <option value="third_secondary_math">الصف الثالث الثانوي (علمي رياضة)</option>
                <option value="third_secondary_literary">الصف الثالث الثانوي (الشعبة الادبية)</option>
              </select>
            </div>
          )}

          {announcementTarget === 'custom' && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                اختر الطلاب ({announcementSelectedUsers.length} محدد)
              </label>
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {users.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">
                    لا يوجد طلاب مسجلون
                  </p>
                ) : (
                  users.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={announcementSelectedUsers.includes(u.id)}
                        onChange={() =>
                          setAnnouncementSelectedUsers((prev) =>
                            prev.includes(u.id)
                              ? prev.filter((id) => id !== u.id)
                              : [...prev, u.id]
                          )
                        }
                        className="accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate" dir="ltr">{u.email}</p>
                      </div>
                      <span className={`text-xs font-medium ${u.isSubscribed ? 'text-success' : 'text-muted-foreground'}`}>
                        {u.isSubscribed ? 'مشترك' : 'مجاني'}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {announcementStatus && (
            <div
              className={`text-sm rounded-lg p-3 ${
                announcementStatus.includes('تم الإرسال')
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {announcementStatus}
            </div>
          )}
          <Button
            onClick={sendAnnouncement}
            disabled={sendingAnnouncement || !announcementTitle.trim()}
            className="gap-2"
          >
            {sendingAnnouncement ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                إرسال الإعلان
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      </>
    );
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return null;
  }

  const filteredTopics = classFilter
    ? topics.filter((t) => t.grade === classFilter)
    : topics;
  const filteredUsers = classFilter
    ? users.filter((u) => u.grade === classFilter)
    : users;
  const filteredQuizzes = classFilter
    ? quizzes.filter((q) => q.grade === classFilter)
    : quizzes;
  const filteredAdvice = classFilter
    ? advice.filter((a) => a.grade === classFilter)
    : advice;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
            <p className="text-muted-foreground mt-1">
              {activeTab === 'content' && 'إدارة المحتوى التعليمي'}
              {activeTab === 'users' && 'إدارة المستخدمين'}
              {activeTab === 'pdfs' && 'إدارة ملفات PDF'}
              {activeTab === 'questionBank' && 'بنك الأسئلة'}
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard')} variant="outline" className="gap-2">
            <ArrowRight className="w-4 h-4" />
            العودة للوحة التحكم
          </Button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            تصفية حسب الصف الدراسي
          </label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full max-w-xs px-4 py-2 rounded-lg border border-border bg-card text-foreground"
          >
            <option value="">كل الصفوف</option>
            {CLASS_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 mb-6 bg-muted p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'content'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            المحتوى
          </button>
          <button
            onClick={() => { setActiveTab('users'); fetchUsers(); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            المستخدمين
          </button>
          <button
            onClick={() => setActiveTab('pdfs')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'pdfs'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-4 h-4" />
            ملفات PDF
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'quizzes'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            الاختبارات
          </button>
          <button
            onClick={() => setActiveTab('questionBank')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'questionBank'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Database className="w-4 h-4" />
            بنك الأسئلة
          </button>
          <button
            onClick={() => { setActiveTab('advice'); fetchAdvice(); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'advice'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            النصائح
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            الإعدادات
          </button>
        </div>

        {activeTab === 'content' && (
        <div className="grid gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                أكواد التفعيل
              </CardTitle>
              <Button onClick={() => setShowCodeForm(true)} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                إنشاء كود
              </Button>
            </CardHeader>
            <CardContent>
              {subscriptionCodes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <KeyRound className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p>لا توجد أكواد تفعيل حالياً</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {subscriptionCodes.map((sc) => (
                    <div
                      key={sc.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {sc.isUsed ? (
                          <Badge variant="outline" className="text-xs">مستخدم</Badge>
                        ) : new Date() > new Date(sc.expiresAt) ? (
                          <Badge variant="destructive" className="text-xs">منتهي</Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">نشط</Badge>
                        )}
                        <span className="font-mono font-bold text-lg">{sc.code}</span>
                        <span className="text-sm text-muted-foreground">
                          ({sc.plan}) - {new Date(sc.expiresAt).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(sc.code)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCode(sc.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                المواضيع
              </CardTitle>
              <Button onClick={() => setShowTopicForm(true)} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة موضوع
              </Button>
            </CardHeader>
            <CardContent>
              {filteredTopics.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p>لا توجد مواضيع حالياً</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div
                        className="flex items-start justify-between gap-3 p-5 bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() =>
                          setExpandedTopic(expandedTopic === topic.id ? null : topic.id)
                        }
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-bold text-foreground truncate">{topic.title}</h3>
                              <Badge variant="secondary" className="flex-shrink-0">{topic.lessons.length} دروس</Badge>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                              {topic.grade ? (
                                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  {getClassByKey(topic.grade)?.short || topic.grade}
                                </span>
                              ) : (
                                <span className="bg-muted px-2 py-0.5 rounded-full">كل الصفوف</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTopicId(topic.id);
                              setShowLessonForm(true);
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTopic(topic);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTopic(topic.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                          {expandedTopic === topic.id ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {expandedTopic === topic.id && (
                        <div className="p-5 bg-background border-t border-border">
                          {topic.lessons.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">
                              لا توجد دروس في هذا الموضوع
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {topic.lessons.map((lesson) => (
                                <div
                                  key={lesson.id}
                                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <Video className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium">{lesson.title}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {lesson.duration}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingLesson(lesson)}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteLesson(lesson.id)}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {(() => {
                                const sortedPdfs = pdfsOrder[topic.id] 
                                  ? pdfsOrder[topic.id] 
                                  : (topic.pdfs || []).sort((a: Pdf, b: Pdf) => a.order - b.order);
                                return sortedPdfs.length > 0 ? (
                                  <div className="mt-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-medium text-muted-foreground">الملفات:</p>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleReorderPdfs(topic.id, pdfsOrder[topic.id] || sortedPdfs)}
                                        className="text-xs h-6"
                                      >
                                        <Save className="w-3 h-3" />
                                        حفظ الترتيب
                                      </Button>
                                    </div>
                                    {sortedPdfs.map((pdf: Pdf, index: number) => (
                            <div
                              key={pdf.id}
                              draggable
                              onDragStart={(e) => {
                                setDraggedPdf({ ...pdf, topicId: topic.id, index });
                                const currentPdfs = pdfsOrder[topic.id] || ((topic.pdfs || []).sort((a: Pdf, b: Pdf) => a.order - b.order));
                                setPdfsOrder({ ...pdfsOrder, [topic.id]: currentPdfs });
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (!draggedPdf) return;
                                const currentPdfs = pdfsOrder[topic.id] ? [...pdfsOrder[topic.id]] : ((topic.pdfs || []).sort((a: Pdf, b: Pdf) => a.order - b.order));
                                const draggedIndex = currentPdfs.findIndex(p => p.id === draggedPdf.id);
                                const targetIndex = index;
                                if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
                                  const [movedItem] = currentPdfs.splice(draggedIndex, 1);
                                  currentPdfs.splice(targetIndex, 0, movedItem);
                                  setPdfsOrder({ ...pdfsOrder, [topic.id]: currentPdfs });
                                }
                                setDraggedPdf(null);
                              }}
                              className={`flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-move ${
                                draggedPdf?.id === pdf.id ? 'opacity-50' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                                  {index + 1}
                                </div>
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{pdf.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {pdf.description}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingPdf(pdf)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePdf(pdf.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        ) : null;
                              })()}

                      {filteredQuizzes.filter((q: any) => q.topicId === topic.id).length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">الاختبارات:</p>
                          {filteredQuizzes.filter((q: any) => q.topicId === topic.id).map((quiz: any) => (
                            <div key={quiz.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <ClipboardList className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{quiz.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {quiz.questions.length} سؤال - درجة النجاح: {quiz.passingScore}%
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setEditingQuiz(quiz)}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteQuiz(quiz.id)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        )}

        {activeTab === 'users' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                المستخدمين المسجلين
              </CardTitle>
              <Button onClick={exportUsersToExcel} size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                تصدير Excel
              </Button>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p>لا يوجد مستخدمين مسجلين</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-2 px-2">الاسم</th>
                        <th className="text-right py-2 px-2">البريد</th>
                        <th className="text-right py-2 px-2">الهاتف</th>
                        <th className="text-right py-2 px-2">الحالة</th>
                        <th className="text-right py-2 px-2">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u: any) => (
                        <tr key={u.id} className="border-b hover:bg-muted/30">
                          <td className="py-2 px-2">{u.name || '-'}</td>
                          <td className="py-2 px-2">{u.email || '-'}</td>
                          <td className="py-2 px-2">{u.phone || '-'}</td>
                          <td className="py-2 px-2">
                            <span className={u.isSubscribed ? 'text-green-600' : 'text-muted-foreground'}>
                              {u.isSubscribed ? 'مشترك' : 'مجاني'}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'pdfs' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                ملفات PDF
              </CardTitle>
              <Button onClick={() => setShowPdfForm(true)} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة ملف
              </Button>
            </CardHeader>
            <CardContent>
              {(() => {
                const pdfCategoryLabels: Record<string, string> = {
                  explanation: 'شروحات وملخصات',
                  solution: 'التمارين و تدريبات',
                  quizzes: 'بنك اسئلة',
                };
                const filteredPdfs = classFilter
                  ? allPdfs.filter((p: any) => p.grade === classFilter || !p.grade)
                  : allPdfs;
                if (filteredPdfs.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p>لا توجد ملفات PDF حالياً</p>
                      <p className="text-sm mt-2">اضغط على "إضافة ملف" لإضافة ملف جديد</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-2">
                    {filteredPdfs.map((pdf: any) => (
                      <div key={pdf.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{pdf.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {pdfCategoryLabels[pdf.category] || pdf.category}
                              {pdf.grade ? ` - ${getClassByKey(pdf.grade)?.short || pdf.grade}` : ' - كل الصفوف'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(pdf.fileUrl, '_blank')}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPdf(pdf)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePdf(pdf.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {activeTab === 'questionBank' && (
          <QuestionBankSection topics={topics} classFilter={classFilter} />
        )}

        {activeTab === 'quizzes' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                الاختبارات
              </CardTitle>
              <div className="flex gap-2">
                <Button onClick={() => setShowGenerateQuiz(true)} variant="outline" size="sm" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  توليد تلقائي
                </Button>
                <Button onClick={() => setShowQuizForm(true)} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  إضافة اختبار
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredQuizzes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p>لا توجد اختبارات حالياً</p>
                  <p className="text-sm mt-2">اضغط على "إضافة اختبار" لإضافة اختبار جديد</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQuizzes.map((quiz: any) => {
                    const topic = topics.find((t: any) => t.id === quiz.topicId);
                    return (
                      <div key={quiz.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <ClipboardList className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{quiz.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {topic?.title || 'بدون موضوع'} - {quiz.questions?.length || 0} سؤال - درجة النجاح: {quiz.passingScore}%
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingQuiz(quiz)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteQuiz(quiz.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'advice' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                نصائحي لك
              </CardTitle>
              <Button onClick={() => setShowAdviceForm(true)} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة نصيحة
              </Button>
            </CardHeader>
            <CardContent>
              {filteredAdvice.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p>لا توجد نصائح حالياً</p>
                  <p className="text-sm mt-2">اضغط على "إضافة نصيحة" لإضافة نصيحة جديدة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAdvice.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                          {item.type === 'video' ? (
                            <Video className="w-5 h-5 text-primary" />
                          ) : (
                            <FileText className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.type === 'video' ? 'فيديو' : 'نص'} - {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingAdvice(item)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteAdvice(item.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <SettingsTab />
        )}
      </div>

      {showTopicForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>إضافة موضوع جديد</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowTopicForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">عنوان الموضوع</label>
                <Input
                  value={topicForm.title}
                  onChange={(e) =>
                    setTopicForm({ ...topicForm, title: e.target.value })
                  }
                  placeholder="مثال: مقاييس النزعة المركزية"
                  className="bg-card border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">الوصف</label>
                <Input
                  value={topicForm.description}
                  onChange={(e) =>
                    setTopicForm({ ...topicForm, description: e.target.value })
                  }
                  placeholder="وصف الموضوع"
                  className="bg-card border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">السنة الدراسية</label>
                <select
                  value={topicForm.grade}
                  onChange={(e) =>
                    setTopicForm({ ...topicForm, grade: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="">كل السنوات</option>
                  <option value="third_preparatory">الصف الثالث الاعدادي</option>
                  <option value="first_secondary">الصف الأول الثانوي</option>
                  <option value="second_secondary">الصف الثاني الثانوي (بكالوريا)</option>
                  <option value="third_secondary_math">الصف الثالث الثانوي (علمي رياضة)</option>
                  <option value="third_secondary_literary">الصف الثالث الثانوي (الشعبة الادبية)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowTopicForm(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleCreateTopic}
                  className="flex-1 gap-2"
                  disabled={!topicForm.title}
                >
                  <Check className="w-4 h-4" />
                  حفظ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {editingTopic && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>تعديل الموضوع</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditingTopic(null)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">عنوان الموضوع</label>
                <Input
                  value={editingTopic.title}
                  onChange={(e) =>
                    setEditingTopic({ ...editingTopic, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">الوصف</label>
                <Input
                  value={editingTopic.description}
                  onChange={(e) =>
                    setEditingTopic({ ...editingTopic, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">السنة الدراسية</label>
                <select
                  value={editingTopic.grade || ''}
                  onChange={(e) =>
                    setEditingTopic({ ...editingTopic, grade: e.target.value || null })
                  }
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="">كل السنوات</option>
                  <option value="third_preparatory">الصف الثالث الاعدادي</option>
                  <option value="first_secondary">الصف الأول الثانوي</option>
                  <option value="second_secondary">الصف الثاني الثانوي (بكالوريا)</option>
                  <option value="third_secondary_math">الصف الثالث الثانوي (علمي رياضة)</option>
                  <option value="third_secondary_literary">الصف الثالث الثانوي (الشعبة الادبية)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingTopic(null)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
                <Button onClick={handleUpdateTopic} className="flex-1 gap-2">
                  <Save className="w-4 h-4" />
                  حفظ التغييرات
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showLessonForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>إضافة درس جديد</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowLessonForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">عنوان الدرس</label>
                <Input
                  value={lessonForm.title}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, title: e.target.value })
                  }
                  placeholder="مثال: المتوسط الحسابي - الأساسيات"
                  className="bg-card border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">الوصف</label>
                <Input
                  value={lessonForm.description}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, description: e.target.value })
                  }
                  placeholder="وصف الدرس"
                  className="bg-card border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">رابط الفيديو (YouTube)</label>
                <Input
                  value={lessonForm.videoUrl}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, videoUrl: e.target.value })
                  }
                  placeholder="https://www.youtube.com/embed/..."
                  className="bg-card border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">المدة</label>
                <Input
                  value={lessonForm.duration}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, duration: e.target.value })
                  }
                  placeholder="12:30"
                  className="bg-card border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">النوع</label>
                <select
                  value={lessonForm.type}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, type: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="explanation">شرح (فيديو تعليمي)</option>
                  <option value="practice">تمرين (حل أسئلة)</option>
                </select>
              </div>
              <AccessTypeSelect
                value={lessonForm.accessType}
                onChange={(v) => setLessonForm({ ...lessonForm, accessType: v })}
              />
              <div>
                <label className="text-sm font-medium mb-2 block">ملخص الدرس (اختياري)</label>
                <textarea
                  value={lessonForm.summary}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, summary: e.target.value })
                  }
                  placeholder="ملخص قصير يظهر بعد الفيديو"
                  rows={3}
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">نقاط مهمة (سطر لكل نقطة)</label>
                <textarea
                  value={lessonForm.keyPoints}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, keyPoints: e.target.value })
                  }
                  placeholder={'المتوسط الحسابي = مجموع القيم ÷ عددها\nالترتيب مهم عند إيجاد الوسيط'}
                  rows={3}
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  ملفات الدرس (سطر لكل ملف: العنوان | الرابط)
                </label>
                <textarea
                  value={lessonForm.files}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, files: e.target.value })
                  }
                  placeholder={'ورقة العمل | https://example.com/work.pdf'}
                  rows={2}
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">السنة الدراسية</label>
                <select
                  value={lessonForm.grade || ''}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, grade: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="">كل السنوات</option>
                  <option value="third_preparatory">الصف الثالث الاعدادي</option>
                  <option value="first_secondary">الصف الأول الثانوي</option>
                  <option value="second_secondary">الصف الثاني الثانوي (بكالوريا)</option>
                  <option value="third_secondary_math">الصف الثالث الثانوي (علمي رياضة)</option>
                  <option value="third_secondary_literary">الصف الثالث الثانوي (الشعبة الادبية)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowLessonForm(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
                <Button onClick={handleCreateLesson} className="flex-1 gap-2">
                  <Check className="w-4 h-4" />
                  حفظ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {editingLesson && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>تعديل الدرس</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditingLesson(null)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">عنوان الدرس</label>
                <Input
                  value={editingLesson.title}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">الوصف</label>
                <Input
                  value={editingLesson.description}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">رابط الفيديو</label>
                <Input
                  value={editingLesson.videoUrl}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, videoUrl: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">المدة</label>
                <Input
                  value={editingLesson.duration}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, duration: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">النوع</label>
                <select
                  value={editingLesson.type || 'explanation'}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, type: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="explanation">شرح (فيديو تعليمي)</option>
                  <option value="practice">تمرين (حل أسئلة)</option>
                </select>
              </div>
              <AccessTypeSelect
                value={editingLesson.accessType || 'FREE'}
                onChange={(v) => setEditingLesson({ ...editingLesson, accessType: v })}
              />
              <div>
                <label className="text-sm font-medium mb-2 block">ملخص الدرس (اختياري)</label>
                <textarea
                  value={editingLesson.summary || ''}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, summary: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">نقاط مهمة (سطر لكل نقطة)</label>
                <textarea
                  value={
                    Array.isArray(editingLesson.keyPoints)
                      ? editingLesson.keyPoints.join('\n')
                      : editingLesson.keyPoints || ''
                  }
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, keyPoints: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  ملفات الدرس (سطر لكل ملف: العنوان | الرابط)
                </label>
                <textarea
                  value={
                    Array.isArray(editingLesson.files)
                      ? editingLesson.files
                          .map((f: { title: string; url: string }) => `${f.title} | ${f.url}`)
                          .join('\n')
                      : editingLesson.files || ''
                  }
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, files: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">السنة الدراسية</label>
                <select
                  value={editingLesson.grade || ''}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, grade: e.target.value || null })
                  }
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="">كل السنوات</option>
                  <option value="third_preparatory">الصف الثالث الاعدادي</option>
                  <option value="first_secondary">الصف الأول الثانوي</option>
                  <option value="second_secondary">الصف الثاني الثانوي (بكالوريا)</option>
                  <option value="third_secondary_math">الصف الثالث الثانوي (علمي رياضة)</option>
                  <option value="third_secondary_literary">الصف الثالث الثانوي (الشعبة الادبية)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingLesson(null)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
                <Button onClick={handleUpdateLesson} className="flex-1 gap-2">
                  <Save className="w-4 h-4" />
                  حفظ التغييرات
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showCodeForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>إنشاء كود تفعيل</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCodeForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">نوع الاشتراك</label>
                <select
                  value={codeForm.plan}
                  onChange={(e) => setCodeForm({ ...codeForm, plan: e.target.value })}
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="monthly">شهري</option>
                  <option value="semester">فصل دراسي</option>
                  <option value="yearly">سنوي</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">مدة الصلاحية (أيام)</label>
                <Input
                  type="number"
                  value={codeForm.durationDays}
                  onChange={(e) => setCodeForm({ ...codeForm, durationDays: e.target.value })}
                  placeholder="30"
                  className="bg-card border-border text-foreground"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCodeForm(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
                <Button onClick={handleCreateCode} className="flex-1 gap-2">
                  <Check className="w-4 h-4" />
                  إنشاء
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showPdfForm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>إضافة ملف PDF جديد</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowPdfForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">عنوان الملف</label>
                  <Input
                    value={pdfForm.title}
                    onChange={(e) =>
                      setPdfForm({ ...pdfForm, title: e.target.value })
                    }
                    placeholder="مثال: ملخص الاحتمالات"
                    className="bg-card border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">الوصف</label>
                  <Input
                    value={pdfForm.description}
                    onChange={(e) =>
                      setPdfForm({ ...pdfForm, description: e.target.value })
                    }
                    placeholder="وصف الملف"
                    className="bg-card border-border text-foreground"
                  />
                </div>
            <div>
              <label className="text-sm font-medium mb-2 block">رابط الملف (PDF)</label>
              <Input
                value={pdfForm.fileUrl}
                onChange={(e) => setPdfForm({ ...pdfForm, fileUrl: e.target.value })}
                placeholder="https://drive.google.com/file/d/..."
                className="bg-card border-border text-foreground"
              />
              {pdfForm.fileUrl && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-green-900/30 rounded-lg">
                  <FileText className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-green-400">تم إدخال الرابط بنجاح</span>
                </div>
              )}
            </div>
              <div>
                <label className="text-sm font-medium mb-2 block">السنة الدراسية</label>
                <select
                  value={pdfForm.grade}
                  onChange={(e) => setPdfForm({ ...pdfForm, grade: e.target.value })}
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="">كل الصفوف</option>
                  {CLASS_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">القسم</label>
                <select
                  value={pdfForm.category}
                  onChange={(e) => setPdfForm({ ...pdfForm, category: e.target.value })}
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="explanation">شروحات وملخصات</option>
                  <option value="solution">التمارين و تدريبات</option>
                  <option value="quizzes">بنك اسئلة</option>
                </select>
              </div>
              <AccessTypeSelect
                value={pdfForm.accessType}
                onChange={(v) => setPdfForm({ ...pdfForm, accessType: v })}
              />
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPdfForm(false);
                      setPdfForm({ title: '', description: '', fileUrl: '', category: 'explanation', accessType: 'FREE', grade: '' });
                    }}
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleCreatePdf}
                    className="flex-1 gap-2"
                    disabled={!pdfForm.title || !pdfForm.fileUrl}
                  >
                    <Check className="w-4 h-4" />
                    حفظ
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {editingPdf && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>تعديل الملف</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditingPdf(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">عنوان الملف</label>
                  <Input
                    value={editingPdf.title}
                    onChange={(e) =>
                      setEditingPdf({ ...editingPdf, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">الوصف</label>
                  <Input
                    value={editingPdf.description}
                    onChange={(e) =>
                      setEditingPdf({ ...editingPdf, description: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">رابط الملف</label>
                  <Input
                    value={editingPdf.fileUrl}
                    onChange={(e) =>
                      setEditingPdf({ ...editingPdf, fileUrl: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">السنة الدراسية</label>
                  <select
                    value={editingPdf.grade || ''}
                    onChange={(e) =>
                      setEditingPdf({ ...editingPdf, grade: e.target.value || null })
                    }
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                  >
                    <option value="">كل الصفوف</option>
                    {CLASS_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">القسم</label>
                  <select
                    value={editingPdf.category || 'explanation'}
                    onChange={(e) =>
                      setEditingPdf({ ...editingPdf, category: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                  >
                    <option value="explanation">شروحات وملخصات</option>
                    <option value="solution">التمارين و تدريبات</option>
                    <option value="quizzes">بنك اسئلة</option>
                  </select>
                </div>
                <AccessTypeSelect
                  value={editingPdf.accessType || 'FREE'}
                  onChange={(v) => setEditingPdf({ ...editingPdf, accessType: v })}
                />
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setEditingPdf(null)}
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                  <Button onClick={handleUpdatePdf} className="flex-1 gap-2">
                    <Save className="w-4 h-4" />
                    حفظ التغييرات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
)}

      <QuizFormModal
        showQuizForm={showQuizForm}
        setShowQuizForm={setShowQuizForm}
        topics={topics}
        onSave={handleCreateQuiz}
      />

      <EditQuizModal
        editingQuiz={editingQuiz}
        setEditingQuiz={setEditingQuiz}
        onSave={handleUpdateQuiz}
      />

      <GenerateQuizModal
        show={showGenerateQuiz}
        setShow={setShowGenerateQuiz}
        topics={topics}
        onGenerated={() => { fetchQuizzes(); }}
      />

      {showAdviceForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>إضافة نصيحة جديدة</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAdviceForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">العنوان</label>
                <Input
                  value={adviceForm.title}
                  onChange={(e) =>
                    setAdviceForm({ ...adviceForm, title: e.target.value })
                  }
                  placeholder="مثال: كيف تفهم الاحتمالات بسهولة"
                  className="bg-card border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">النوع</label>
                <select
                  value={adviceForm.type}
                  onChange={(e) =>
                    setAdviceForm({ ...adviceForm, type: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="text">نص</option>
                  <option value="video">فيديو</option>
                </select>
              </div>
              {adviceForm.type === 'video' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">رابط الفيديو (YouTube)</label>
                  <Input
                    value={adviceForm.videoUrl}
                    onChange={(e) =>
                      setAdviceForm({ ...adviceForm, videoUrl: e.target.value })
                    }
                    placeholder="https://www.youtube.com/embed/..."
                    className="bg-card border-border text-foreground"
                  />
                </div>
              )}
              {adviceForm.type === 'text' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">المحتوى</label>
                  <textarea
                    value={adviceForm.content}
                    onChange={(e) =>
                      setAdviceForm({ ...adviceForm, content: e.target.value })
                    }
                    placeholder="اكتب النصيحة هنا..."
                    rows={6}
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground resize-none"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-2 block">السنة الدراسية</label>
                <select
                  value={adviceForm.grade || ''}
                  onChange={(e) =>
                    setAdviceForm({ ...adviceForm, grade: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="">كل السنوات</option>
                  <option value="third_preparatory">الصف الثالث الاعدادي</option>
                  <option value="first_secondary">الصف الأول الثانوي</option>
                  <option value="second_secondary">الصف الثاني الثانوي (بكالوريا)</option>
                  <option value="third_secondary_math">الصف الثالث الثانوي (علمي رياضة)</option>
                  <option value="third_secondary_literary">الصف الثالث الثانوي (الشعبة الادبية)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAdviceForm(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleCreateAdvice}
                  className="flex-1 gap-2"
                  disabled={!adviceForm.title}
                >
                  <Check className="w-4 h-4" />
                  حفظ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {editingAdvice && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>تعديل النصيحة</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditingAdvice(null)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">العنوان</label>
                <Input
                  value={editingAdvice.title}
                  onChange={(e) =>
                    setEditingAdvice({ ...editingAdvice, title: e.target.value })
                  }
                  className="bg-card border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">النوع</label>
                <select
                  value={editingAdvice.type}
                  onChange={(e) =>
                    setEditingAdvice({ ...editingAdvice, type: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="text">نص</option>
                  <option value="video">فيديو</option>
                </select>
              </div>
              {editingAdvice.type === 'video' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">رابط الفيديو</label>
                  <Input
                    value={editingAdvice.videoUrl || ''}
                    onChange={(e) =>
                      setEditingAdvice({ ...editingAdvice, videoUrl: e.target.value })
                    }
                    className="bg-card border-border text-foreground"
                  />
                </div>
              )}
              {editingAdvice.type === 'text' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">المحتوى</label>
                  <textarea
                    value={editingAdvice.content || ''}
                    onChange={(e) =>
                      setEditingAdvice({ ...editingAdvice, content: e.target.value })
                    }
                    rows={6}
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground resize-none"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-2 block">السنة الدراسية</label>
                <select
                  value={editingAdvice.grade || ''}
                  onChange={(e) =>
                    setEditingAdvice({ ...editingAdvice, grade: e.target.value || null })
                  }
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="">كل السنوات</option>
                  <option value="third_preparatory">الصف الثالث الاعدادي</option>
                  <option value="first_secondary">الصف الأول الثانوي</option>
                  <option value="second_secondary">الصف الثاني الثانوي (بكالوريا)</option>
                  <option value="third_secondary_math">الصف الثالث الثانوي (علمي رياضة)</option>
                  <option value="third_secondary_literary">الصف الثالث الثانوي (الشعبة الادبية)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingAdvice(null)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
                <Button onClick={handleUpdateAdvice} className="flex-1 gap-2">
                  <Save className="w-4 h-4" />
                  حفظ التغييرات
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
