import {
  Activity, Apple, Archive, ArrowUpRight, Atom, Baby, Banknote, Bell, Bike, Book, BookOpen, Bookmark, Bot, Brain, Briefcase, Brush,
  Bug, Building2, Cake, Calculator, Calendar, Camera, Car, Cat, ChartLine, Check, ClipboardList, Clock, Cloud, CloudRain, Code, Coffee,
  Coins, Command, Compass, CookingPot, Cpu, CreditCard, Database, Dog, Dumbbell, FilePen, FileText, Film, Flag, Flame, FlaskConical,
  Flower2, Folder, Footprints, Gamepad2, Gem, Gift, GitBranch, Globe, GraduationCap, Guitar, Handshake, Hash, Headphones, Heart,
  Hotel, Hourglass, House, Image, Inbox, Key, Languages, Laptop, Leaf, Library, Lightbulb, Link, ListChecks, ListTodo, Lock, Luggage,
  Mail, Map as MapIcon, MapPin, Megaphone, Mic, Microscope, Moon, Mountain, Music, NotebookPen, Palette, Paperclip, PawPrint, Pencil, PenTool,
  Phone, PiggyBank, Pill, Pizza, Plane, Presentation, Puzzle, Quote, Radio, Receipt, Rocket, School, Server, Settings, ShoppingBag,
  ShoppingCart, Smartphone, Smile, Sofa, Sparkles, Sprout, Star, Stethoscope, StickyNote, Sun, Tag, Target, Tent, Terminal, Ticket,
  TrainFront, TreePine, TrendingUp, Trophy, Tv, Users, Utensils, Wallet, Wifi, Wrench, Zap, type LucideIcon,
} from 'lucide-react';

export interface SymbolOption {
  id: string;
  icon: LucideIcon;
  label: string;
  /** English and Turkish search words. */
  keywords: string[];
  category: string;
}

const s = (category: string, id: string, icon: LucideIcon, label: string, keywords: string) =>
  ({ id, icon, label, category, keywords: keywords.split(' ') }) satisfies SymbolOption;

/** The note symbols: one line-icon family, monochrome, searchable in English and Turkish. */
export const SYMBOL_OPTIONS: SymbolOption[] = [
  s('General', 'pencil', Pencil, 'Pencil', 'write note draft yaz not kalem taslak'),
  s('General', 'sticky-note', StickyNote, 'Sticky note', 'memo note reminder not hatırlatma yapışkan'),
  s('General', 'star', Star, 'Star', 'favorite important favori önemli yıldız'),
  s('General', 'heart', Heart, 'Heart', 'love like personal sevgi kalp kişisel'),
  s('General', 'bookmark', Bookmark, 'Bookmark', 'save later kaydet sonra yer imi'),
  s('General', 'flag', Flag, 'Flag', 'goal milestone hedef bayrak'),
  s('General', 'tag', Tag, 'Tag', 'label category etiket kategori'),
  s('General', 'hash', Hash, 'Hash', 'topic channel konu kanal'),
  s('General', 'lightbulb', Lightbulb, 'Idea', 'idea think fikir ampul düşünce'),
  s('General', 'sparkles', Sparkles, 'Sparkles', 'magic new special yeni özel parıltı'),
  s('General', 'zap', Zap, 'Lightning', 'fast quick energy hızlı enerji şimşek'),
  s('General', 'flame', Flame, 'Flame', 'hot urgent fire acil ateş sıcak'),
  s('General', 'gem', Gem, 'Gem', 'valuable diamond değerli elmas mücevher'),
  s('General', 'target', Target, 'Target', 'goal focus aim hedef odak'),
  s('General', 'trophy', Trophy, 'Trophy', 'win award success kazan ödül başarı kupa'),
  s('General', 'rocket', Rocket, 'Rocket', 'launch start project başlat proje roket'),
  s('General', 'quote', Quote, 'Quote', 'quote saying alıntı söz'),
  s('General', 'smile', Smile, 'Smile', 'happy mood mutlu ruh hali gülümse'),
  s('General', 'arrow-up-right', ArrowUpRight, 'Arrow', 'link external next bağlantı sonraki ok'),
  s('General', 'command', Command, 'Command', 'shortcut keyboard kısayol klavye komut'),

  s('Plans', 'check', Check, 'Done', 'done complete task bitti tamam görev'),
  s('Plans', 'list-todo', ListTodo, 'To-do', 'todo tasks list yapılacak görev liste'),
  s('Plans', 'list-checks', ListChecks, 'Checklist', 'checklist steps kontrol listesi adımlar'),
  s('Plans', 'calendar', Calendar, 'Calendar', 'date schedule event tarih takvim etkinlik'),
  s('Plans', 'clock', Clock, 'Clock', 'time hour deadline zaman saat süre'),
  s('Plans', 'hourglass', Hourglass, 'Hourglass', 'waiting later pending bekleyen kum saati'),
  s('Plans', 'bell', Bell, 'Bell', 'reminder alert notification hatırlatma bildirim zil'),
  s('Plans', 'inbox', Inbox, 'Inbox', 'incoming new gelen kutusu yeni'),
  s('Plans', 'archive', Archive, 'Archive', 'old stored eski arşiv'),
  s('Plans', 'folder', Folder, 'Folder', 'files collection dosya klasör'),
  s('Plans', 'file-text', FileText, 'Document', 'document text file belge metin dosya'),
  s('Plans', 'file-pen', FilePen, 'Edit document', 'markdown edit document düzenle belge'),
  s('Plans', 'paperclip', Paperclip, 'Attachment', 'attach clip ek ataş'),
  s('Plans', 'link', Link, 'Link', 'url web link bağlantı'),
  s('Plans', 'lock', Lock, 'Lock', 'private secret password gizli şifre kilit'),
  s('Plans', 'key', Key, 'Key', 'access password anahtar şifre erişim'),

  s('Work', 'briefcase', Briefcase, 'Work', 'job office business iş ofis çanta'),
  s('Work', 'building', Building2, 'Company', 'company office building şirket bina'),
  s('Work', 'presentation', Presentation, 'Presentation', 'slides meeting sunum toplantı'),
  s('Work', 'chart', ChartLine, 'Chart', 'report stats analytics rapor grafik istatistik'),
  s('Work', 'trending-up', TrendingUp, 'Growth', 'growth sales progress büyüme satış ilerleme'),
  s('Work', 'clipboard', ClipboardList, 'Clipboard', 'plan agenda gündem plan pano'),
  s('Work', 'mail', Mail, 'Mail', 'email letter e-posta posta mektup'),
  s('Work', 'phone', Phone, 'Phone', 'call contact ara telefon iletişim'),
  s('Work', 'users', Users, 'People', 'team meeting people ekip takım kişiler'),
  s('Work', 'handshake', Handshake, 'Deal', 'deal client agreement anlaşma müşteri'),
  s('Work', 'megaphone', Megaphone, 'Announcement', 'marketing announce duyuru pazarlama'),

  s('School', 'graduation-cap', GraduationCap, 'Graduation', 'school university thesis okul üniversite mezuniyet tez'),
  s('School', 'school', School, 'School', 'class lesson okul ders sınıf'),
  s('School', 'book-open', BookOpen, 'Reading', 'read book study oku kitap ders çalış'),
  s('School', 'book', Book, 'Book', 'book novel kitap roman'),
  s('School', 'library', Library, 'Library', 'books research kütüphane araştırma'),
  s('School', 'notebook', NotebookPen, 'Notebook', 'notebook journal diary defter günlük'),
  s('School', 'pen-tool', PenTool, 'Pen', 'design draw tasarım çizim kalem'),
  s('School', 'calculator', Calculator, 'Calculator', 'math numbers matematik hesap makinesi'),
  s('School', 'flask', FlaskConical, 'Lab', 'chemistry experiment science kimya deney bilim'),
  s('School', 'microscope', Microscope, 'Microscope', 'biology research biyoloji araştırma mikroskop'),
  s('School', 'atom', Atom, 'Physics', 'physics science fizik bilim atom'),
  s('School', 'languages', Languages, 'Languages', 'language translate dil çeviri'),

  s('Tech', 'code', Code, 'Code', 'code programming developer kod yazılım programlama'),
  s('Tech', 'terminal', Terminal, 'Terminal', 'shell command line komut satırı'),
  s('Tech', 'bug', Bug, 'Bug', 'bug issue error hata sorun'),
  s('Tech', 'git-branch', GitBranch, 'Branch', 'git version repo sürüm'),
  s('Tech', 'database', Database, 'Database', 'data sql veri veritabanı'),
  s('Tech', 'server', Server, 'Server', 'server hosting deploy sunucu'),
  s('Tech', 'cpu', Cpu, 'Hardware', 'chip computer donanım bilgisayar işlemci'),
  s('Tech', 'laptop', Laptop, 'Laptop', 'computer pc bilgisayar dizüstü'),
  s('Tech', 'smartphone', Smartphone, 'Phone app', 'mobile app telefon uygulama mobil'),
  s('Tech', 'globe', Globe, 'Web', 'web internet site world dünya'),
  s('Tech', 'wifi', Wifi, 'Network', 'network internet ağ'),
  s('Tech', 'cloud', Cloud, 'Cloud', 'cloud sync online bulut'),
  s('Tech', 'bot', Bot, 'AI', 'ai robot assistant yapay zeka asistan'),
  s('Tech', 'puzzle', Puzzle, 'Puzzle', 'plugin problem extension eklenti bulmaca'),
  s('Tech', 'settings', Settings, 'Settings', 'config setup ayarlar yapılandırma'),
  s('Tech', 'wrench', Wrench, 'Tools', 'fix repair tool tamir araç anahtar'),

  s('Money', 'wallet', Wallet, 'Wallet', 'money budget para bütçe cüzdan'),
  s('Money', 'credit-card', CreditCard, 'Card', 'card payment kart ödeme'),
  s('Money', 'banknote', Banknote, 'Cash', 'cash money nakit para'),
  s('Money', 'coins', Coins, 'Coins', 'savings money birikim para bozuk'),
  s('Money', 'piggy-bank', PiggyBank, 'Savings', 'savings save birikim kumbara'),
  s('Money', 'receipt', Receipt, 'Receipt', 'bill invoice expense fatura fiş harcama'),
  s('Money', 'shopping-cart', ShoppingCart, 'Shopping', 'groceries buy market alışveriş al'),
  s('Money', 'shopping-bag', ShoppingBag, 'Shopping bag', 'store purchase mağaza satın'),
  s('Money', 'gift', Gift, 'Gift', 'present birthday hediye doğum günü'),

  s('Health', 'activity', Activity, 'Health', 'health heart rate sağlık nabız'),
  s('Health', 'dumbbell', Dumbbell, 'Workout', 'gym fitness exercise spor antrenman egzersiz'),
  s('Health', 'bike', Bike, 'Cycling', 'bike ride cycle bisiklet'),
  s('Health', 'footprints', Footprints, 'Walking', 'walk steps run yürüyüş adım koşu'),
  s('Health', 'pill', Pill, 'Medicine', 'medicine pill ilaç hap'),
  s('Health', 'stethoscope', Stethoscope, 'Doctor', 'doctor appointment hospital doktor randevu hastane'),
  s('Health', 'brain', Brain, 'Mind', 'mind mental think zihin beyin'),
  s('Health', 'moon', Moon, 'Sleep', 'sleep night uyku gece ay'),
  s('Health', 'apple', Apple, 'Nutrition', 'diet food fruit diyet beslenme meyve elma'),

  s('Travel', 'plane', Plane, 'Flight', 'travel flight trip seyahat uçuş uçak gezi'),
  s('Travel', 'car', Car, 'Car', 'car drive road araba yol sürüş'),
  s('Travel', 'train', TrainFront, 'Train', 'train rail tren'),
  s('Travel', 'map', MapIcon, 'Map', 'map route harita rota'),
  s('Travel', 'map-pin', MapPin, 'Place', 'place location address yer konum adres'),
  s('Travel', 'compass', Compass, 'Explore', 'explore direction keşif yön pusula'),
  s('Travel', 'luggage', Luggage, 'Luggage', 'packing trip bavul valiz bagaj'),
  s('Travel', 'hotel', Hotel, 'Hotel', 'hotel stay booking otel konaklama rezervasyon'),
  s('Travel', 'ticket', Ticket, 'Ticket', 'ticket event concert bilet etkinlik konser'),
  s('Travel', 'mountain', Mountain, 'Mountain', 'hiking outdoor dağ doğa yürüyüşü'),
  s('Travel', 'tent', Tent, 'Camping', 'camp outdoor kamp çadır'),

  s('Media', 'music', Music, 'Music', 'music song playlist müzik şarkı'),
  s('Media', 'headphones', Headphones, 'Listening', 'music podcast audio listen müzik dinle kulaklık'),
  s('Media', 'guitar', Guitar, 'Guitar', 'music instrument band müzik enstrüman gitar'),
  s('Media', 'mic', Mic, 'Microphone', 'record voice podcast music kayıt ses mikrofon müzik'),
  s('Media', 'radio', Radio, 'Radio', 'radio broadcast music radyo yayın müzik'),
  s('Media', 'camera', Camera, 'Camera', 'photo picture fotoğraf kamera'),
  s('Media', 'image', Image, 'Image', 'picture gallery resim görsel galeri'),
  s('Media', 'film', Film, 'Film', 'movie cinema video film sinema'),
  s('Media', 'tv', Tv, 'TV', 'series show watch dizi izle televizyon'),
  s('Media', 'gamepad', Gamepad2, 'Games', 'game play oyun'),
  s('Media', 'palette', Palette, 'Art', 'art color design sanat renk'),
  s('Media', 'brush', Brush, 'Paint', 'paint draw boya resim fırça'),

  s('Home', 'house', House, 'Home', 'home house ev'),
  s('Home', 'sofa', Sofa, 'Living', 'furniture room mobilya oda'),
  s('Home', 'utensils', Utensils, 'Meal', 'food restaurant eat yemek restoran'),
  s('Home', 'cooking-pot', CookingPot, 'Recipe', 'cook recipe kitchen tarif mutfak pişir'),
  s('Home', 'coffee', Coffee, 'Coffee', 'coffee break cafe kahve mola'),
  s('Home', 'pizza', Pizza, 'Pizza', 'pizza food yemek'),
  s('Home', 'cake', Cake, 'Celebration', 'birthday party cake doğum günü parti pasta'),
  s('Home', 'baby', Baby, 'Baby', 'baby kid family bebek çocuk aile'),
  s('Home', 'dog', Dog, 'Dog', 'dog pet köpek evcil'),
  s('Home', 'cat', Cat, 'Cat', 'cat pet kedi evcil'),
  s('Home', 'paw-print', PawPrint, 'Pets', 'pet animal evcil hayvan pati'),

  s('Nature', 'leaf', Leaf, 'Leaf', 'nature green eco doğa yeşil yaprak'),
  s('Nature', 'sprout', Sprout, 'Grow', 'plant garden grow bitki bahçe filiz'),
  s('Nature', 'flower', Flower2, 'Flower', 'flower spring çiçek bahar'),
  s('Nature', 'tree', TreePine, 'Tree', 'forest tree orman ağaç'),
  s('Nature', 'sun', Sun, 'Sun', 'sunny summer day güneş yaz gün'),
  s('Nature', 'cloud-rain', CloudRain, 'Weather', 'rain weather yağmur hava durumu'),
];

export const DEFAULT_SYMBOL = 'pencil';
export const TEXT_FILE_SYMBOL = 'file-text';
export const MARKDOWN_FILE_SYMBOL = 'file-pen';

const BY_ID = new Map(SYMBOL_OPTIONS.map(option => [option.id, option]));

/** Symbols from before the icon set, mapped to their closest icon. */
const LEGACY: Record<string, string> = {
  '✎': 'pencil', '⌘': 'command', '</>': 'code', '✓': 'check', '★': 'star',
  '⚡': 'zap', '↗': 'arrow-up-right', '☷': 'list-todo', '◈': 'gem', '📁': 'folder',
};

/** A stored symbol as a known icon id: legacy characters are mapped, unknown values fall back. */
export function normalizeSymbol(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_SYMBOL;
  if (BY_ID.has(value)) return value;
  return LEGACY[value] ?? DEFAULT_SYMBOL;
}

export const symbolIcon = (id: string): LucideIcon => (BY_ID.get(id) ?? BY_ID.get(DEFAULT_SYMBOL)!).icon;
export const symbolLabel = (id: string) => BY_ID.get(id)?.label ?? 'Pencil';

/** Every word of the query must start a word of the label or keywords (Turkish-aware). */
export function searchSymbols(query: string): SymbolOption[] {
  const words = query.trim().toLocaleLowerCase('tr').split(/\s+/).filter(Boolean);
  if (!words.length) return SYMBOL_OPTIONS;
  return SYMBOL_OPTIONS.filter(option => {
    const haystack = [option.label, option.category, ...option.keywords].map(word => word.toLocaleLowerCase('tr'));
    return words.every(word => haystack.some(candidate => candidate.startsWith(word) || candidate.split(/[\s-]/).some(part => part.startsWith(word))));
  });
}
