# منصة تعلم الرياضيات والإحصاء - منصة تعليمية للصف الثالث الثانوي المصري

## 1. Concept & Vision

منصة تعليمية أنيقة ومريحة للطلاب المصريون في الصف الثالث الثانوي، تركز على تبسيط الرياضيات والإحصاء من خلال فيديوهات تعليمية عالية الجودة. التصميم يعكس الهدوء والتركيز، مع لمسات عصرية تحفز الطلاب على التعلم.

## 2. Design Language

### Aesthetic Direction
تصميم مستوحى من المنصات التعليمية الحديثة مثل Khan Academy و Coursera، مع لمسة عربية أصيلة. الخطوط نظيفة، المساحات واسعة، والألوان هادئة تساعد على التركيز.

### Color Palette
```
Primary:      #2563EB (أزرق تعليمي - الثقة والمعرفة)
Secondary:    #7C3AED (بنفسجي - الإبداع)
Accent:       #10B981 (أخضر - النجاح والتقدم)
Background:   #FAFBFC (أبيض مائل للرمادي)
Surface:      #FFFFFF (أبيض نقي للبطاقات)
Text Primary: #1E293B (رمادي داكن)
Text Secondary: #64748B (رمادي متوسط)
Border:       #E2E8F0 (رمادي فاتح)
Success:      #22C55E (أخضر زاهي)
Warning:      #F59E0B (برتقالي)
Error:        #EF4444 (أحمر)
```

### Typography
- **Primary Font:** IBM Plex Sans Arabic (Google Fonts)
- **Fallback:** system-ui, sans-serif
- **Scale:** 14px base, 1.5 line-height
- **Headings:** Bold (700), sizes: h1=2.5rem, h2=2rem, h3=1.5rem, h4=1.25rem

### Spatial System
- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96px
- Card padding: 24px
- Page max-width: 1280px
- Card border-radius: 12px

### Motion Philosophy
- Transitions: 200ms ease-out for interactions
- Page transitions: 300ms ease-in-out
- Hover effects: scale(1.02) on cards, color shifts on buttons
- Progress animations: smooth fill animations 400ms

### Visual Assets
- Icons: Lucide React (consistent stroke width)
- Decorative: Subtle gradient overlays, soft shadows
- Video thumbnails: 16:9 aspect ratio with play button overlay

## 3. Layout & Structure

### Page Structure
```
├── Navbar (fixed top, blur backdrop)
├── Sidebar (collapsible, navigation)
├── Main Content (scrollable, responsive grid)
└── Footer (minimal, links)
```

### Navigation
- **الرئيسية** (Home) - نظرة عامة على التقدم والمواضيع
- **الدروس** (Lessons) - فيديوهات تعليمية منظمة
- **التدريب** (Practice) - تمارين تطبيقية
- **الاختبارات** (Quizzes) - تقييم ذاتي
- **تطويري** (Progress) - تتبع الإنجاز

### Responsive Strategy
- Desktop: Full sidebar + content grid (3-4 columns)
- Tablet: Collapsed sidebar + 2 columns
- Mobile: Bottom navigation + single column

## 4. Features & Interactions

### Core Features

#### 1. Dashboard (الرئيسية)
- بطاقة ترحيب شخصية
- شريط تقدم عام
- إحصائيات سريعة (الدروس المكتملة، الاختبارات، الساعات)
- آخر المواضيع المتابعة
- توصيات للتعلم

#### 2. Lessons (الدروس)
- قائمة المواضيع الإحصائية:
  - Measures of Central Tendency (مقاييس النزعة المركزية)
  - Mean, Median, Mode
  - Variance and Standard Deviation
  - Probability Basics
  - Conditional Probability
- كل درس يحتوي على:
  - Video player (YouTube embed)
  - ملخص الدرس
  - نقاط رئيسية
  - روابط الموارد

#### 3. Practice (التدريب)
- تمارين متدرجة الصعوبة
- أنواع الأسئلة: اختيار من متعدد، صح/خطأ، مسائل حسابية
- تغذية راجعة فورية
- تلميحات عند الحاجة
- حفظ التقدم

#### 4. Quizzes (الاختبارات)
- اختبارات قصيرة لكل وحدة
- مؤقت اختياري
- نتائج فورية مع شرح
- محاولة واحدة/محاولات متعددة

#### 5. Progress (تطويري)
- رسم بياني للتقدم
- شارات وإنجازات
- سجل النشاط
- مقارنة الأداء

### Interaction Details
- **Card Hover:** Subtle lift (translateY -2px) + shadow increase
- **Button Click:** Scale down 0.98, then up
- **Video Play:** Smooth fade in overlay
- **Quiz Submit:** Loading spinner, then result reveal
- **Error State:** Shake animation + red border

## 5. Component Inventory

### Navigation Components
| Component | States | Description |
|-----------|--------|-------------|
| Navbar | default, scrolled | Fixed header with logo, search, user avatar |
| Sidebar | expanded, collapsed | Main navigation with icons and labels |
| MobileNav | visible, hidden | Bottom tab bar for mobile |

### Content Components
| Component | States | Description |
|-----------|--------|-------------|
| TopicCard | default, hover, completed, locked | Card for topics with progress indicator |
| LessonCard | default, hover, active | Video lesson with thumbnail |
| VideoPlayer | loading, playing, paused, error | Embedded video with controls |
| PracticeCard | default, answered, correct, incorrect | Exercise with input and feedback |
| QuizCard | not-started, in-progress, completed | Quiz with questions and timer |

### UI Components
| Component | States | Description |
|-----------|--------|-------------|
| Button | default, hover, active, disabled, loading | Primary, secondary, ghost variants |
| ProgressBar | empty, partial, complete | Animated progress indicator |
| Badge | default, success, warning, error | Small status indicators |
| Card | default, hover | Container with shadow and border |
| Input | default, focus, error, disabled | Form inputs |
| Select | default, open, disabled | Dropdown selector |
| Modal | closed, open | Overlay dialog |

## 6. Technical Approach

### Framework & Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS 4
- **Language:** TypeScript
- **RTL:** Full Arabic RTL support via Tailwind
- **State:** React hooks (useState, useEffect, useContext)
- **Icons:** Lucide React

### Data Architecture
```typescript
interface Topic {
  id: string;
  title: string;
  description: string;
  icon: string;
  lessons: Lesson[];
  progress: number;
}

interface Lesson {
  id: string;
  title: string;
  videoUrl: string;
  duration: string;
  summary: string;
  completed: boolean;
}

interface Exercise {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'numeric';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  hint?: string;
}

interface Quiz {
  id: string;
  title: string;
  questions: Exercise[];
  timeLimit?: number;
  passingScore: number;
}
```

### File Structure
```
app/
├── layout.tsx          # Root layout with RTL support
├── page.tsx           # Dashboard
├── lessons/
│   └── page.tsx       # Lessons list
├── practice/
│   └── page.tsx       # Practice exercises
├── quizzes/
│   └── page.tsx       # Quizzes list
├── progress/
│   └── page.tsx       # Progress tracking
├── globals.css        # Global styles + RTL utilities
components/
├── ui/                # Reusable UI components
├── layout/            # Layout components
├── features/          # Feature-specific components
lib/
├── data.ts           # Mock data
├── utils.ts          # Utility functions
```

### Performance Considerations
- Lazy load video embeds
- Optimize images with Next.js Image
- Code split by route
- Minimize bundle size
