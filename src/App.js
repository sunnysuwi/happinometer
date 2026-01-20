import React, { useState, useEffect, useCallback } from 'react';
import { 
  Heart, Activity, Smile, Users, BookOpen, DollarSign, Briefcase, Sun, Moon, 
  Save, BarChart2, FileText, 
  Clock, Award, AlertCircle, RefreshCw, ChevronRight, Home
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';

// --- Configuration ---
// *สำคัญ* URL Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzfO-hAtoOz21L-fWWEqaj-YpjzOLat0WzXXI7kYtWQbKppDjfroJekOr7WSrA7dudX/exec"; 

// --- Constants & Mappings ---
const ENGAGEMENT_MAPPING = {
  say: ['q55', 'q56'],
  stay: ['q58', 'q59'],
  strive: ['q57', 'q60', 'q61', 'q62', 'q63']
};

const SECTION_ID_MAP = {
  'body': 'Happy Body',
  'relax': 'Happy Relax',
  'heart': 'Happy Heart',
  'soul': 'Happy Soul',
  'family': 'Happy Family',
  'society': 'Happy Society',
  'brain': 'Happy Brain',
  'money': 'Happy Money',
  'worklife': 'Happy Work Life'
};

const INTERPRETATION = [
  { label: "Very Happy (มีความสุขมากที่สุด)", min: 75.00, color: "text-green-700", bg: "bg-green-100", border: "border-green-200" },
  { label: "Happy (มีความสุข)", min: 50.00, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
  { label: "Unhappy (ไม่มีความสุข)", min: 25.00, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100" },
  { label: "Very Unhappy (ไม่มีความสุขเลย)", min: 0, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" }
];

const getInterpretation = (score) => {
  return INTERPRETATION.find(i => score >= i.min) || INTERPRETATION[3];
};

// --- Mock Data (Fallback if API fails) ---
const MOCK_DASHBOARD_DATA = {
  happiness: [
    { category: "Happy Body", score: 64.47 },
    { category: "Happy Relax", score: 57.20 },
    { category: "Happy Heart", score: 70.77 },
    { category: "Happy Soul", score: 71.18 },
    { category: "Happy Family", score: 66.17 },
    { category: "Happy Society", score: 64.22 },
    { category: "Happy Brain", score: 63.92 },
    { category: "Happy Money", score: 52.96 },
    { category: "Happy Work Life", score: 64.39 },
  ],
  engagement: {
    overall: 66.53,
    dims: [
      { name: "Say", score: 68.5 },
      { name: "Stay", score: 62.3 },
      { name: "Strive", score: 68.8 },
    ]
  },
  balance: 57.10,
  byDepartment: [
     { name: 'สสอ.', score: 68.61 }, 
     { name: 'รพ.สต.', score: 68.61 }, 
     { name: 'ศูนย์บริการฯ', score: 66.56 }, 
     { name: 'รพ.ศูนย์/ทั่วไป', score: 62.10 }, 
     { name: 'รพ.สาขา', score: 59.45 }
  ],
  byGender: [
     { name: 'หญิง', score: 64.07 }, 
     { name: 'ชาย', score: 63.52 }, 
     { name: 'เพศทางเลือก', score: 59.77 }
  ],
  byEmployment: [
     { name: 'ลูกจ้างประจำ', score: 64.84 }, 
     { name: 'ข้าราชการ', score: 64.60 }, 
     { name: 'พนักงานกระทรวง', score: 64.49 }, 
     { name: 'ลูกจ้างชั่วคราว', score: 63.22 }, 
     { name: 'พนักงานราชการ', score: 62.58 }
  ],
  byGeneration: [
     { name: 'Baby Boomer', score: 68.76 }, 
     { name: 'Gen X', score: 65.54 }, 
     { name: 'Gen Z', score: 62.50 }, 
     { name: 'Gen Y', score: 62.49 }
  ]
};

// --- Question Structure ---
const SECTIONS = [
  {
    id: 'personal_1',
    title: 'ส่วนที่ 1 ข้อมูลส่วนบุคคล',
    icon: <Users className="w-6 h-6" />,
    questions: [
      { id: 'full_name', text: 'ชื่อ-นามสกุล', type: 'textarea', placeholder: 'ระบุชื่อและนามสกุลของท่าน (พิมพ์ได้ยาวต่อเนื่อง)' },
      { id: '1.1', text: '1.1 เพศ', type: 'radio', options: ['1. เพศชาย', '2. เพศหญิง', '3. เพศทางเลือก'] },
      { id: '1.1_pregnant', text: 'กรณีเป็นเพศหญิง/เพศทางเลือก : ขณะนี้ท่านกำลังตั้งครรภ์หรือไม่', type: 'radio', options: ['1. ตั้งครรภ์', '2. ไม่ได้ตั้งครรภ์'], condition: (answers) => answers['1.1'] === '2. เพศหญิง' || answers['1.1'] === '3. เพศทางเลือก' },
      { id: '1.2', text: '1.2 อายุ (ปี)', type: 'number', placeholder: 'ระบุอายุ (ปี)' },
      { id: '1.3', text: '1.3 จังหวัดที่ท่านอาศัยอยู่ในปัจจุบันเป็นจังหวัดเดียวกับภูมิลำเนาหรือไม่', type: 'radio', options: ['1. ใช่', '2. ไม่ใช่'] },
      { id: '1.4', text: '1.4 ท่านจบการศึกษาสูงสุด ในระดับใด (ไม่รวมระดับการศึกษาที่ยังไม่สำเร็จการศึกษา)', type: 'select', options: ['1. ประถมศึกษาหรือต่ำกว่า', '2. มัธยมศึกษาตอนต้น', '3. มัธยมศึกษาตอนปลาย', '4. ปวช.', '5. ปวส.', '6. อนุปริญญาหรือเทียบเท่า', '7. ปริญญาตรี', '8. สูงกว่าปริญญาตรี', '9. ไม่มีวุฒิการศึกษา'] },
      { id: '1.5', text: '1.5 สถานภาพสมรส', type: 'radio', options: ['1. โสด', '2. แต่งงานและอยู่ร่วมกัน', '3. แต่งงานแต่ไม่ได้อยู่ด้วยกัน', '4. อยู่ด้วยกันโดยไม่ได้แต่งงาน', '5. หม้าย', '6. หย่าร้าง'] },
      { id: '1.6', text: '1.6 ท่านมีบุตรหรือไม่ (รวมลูกบุญธรรม/ลูกติด/ลูกเลี้ยง)', type: 'radio', options: ['1. ไม่มี', '2. มี จำนวน 1 คน', '3. มี จำนวน 2 คน', '4. มี จำนวน 3-4 คน', '5. มี จำนวนตั้งแต่ 5 คนขึ้นไป'] },
      { id: '1.7', text: '1.7 งานที่ท่านทำเป็นงานลักษณะใด', type: 'radio', options: ['1. งานด้านบริหาร', '2. งานด้านการบริการ', '3. งานด้านวิชาการ', '4. งานด้านสนับสนุน'] }
    ]
  },
  {
    id: 'personal_2',
    title: 'ข้อมูลส่วนบุคคล (ต่อ)',
    icon: <Briefcase className="w-6 h-6" />,
    questions: [
      { id: '1.8', text: '1.8 ท่านปฏิบัติงานในระดับตำแหน่งใด', type: 'radio', options: ['1. ระดับปฏิบัติงาน', '2. ระดับหัวหน้าฝ่าย/หัวหน้ากลุ่ม/หัวหน้างาน', '3. ระดับผู้บริหารองค์กร'] },
      { id: '1.9', text: '1.9 สถานภาพการจ้างงาน', type: 'select', options: ['1. ข้าราชการ', '2. พนักงานราชการ', '3. พนักงานกระทรวง', '4. ลูกจ้างประจำ', '5. ลูกจ้างชั่วคราว'] },
      { id: '1.10', text: '1.10 สายงานของท่าน', type: 'select', options: ['1. นายแพทย์', '2. ทันตแพทย์', '3. เภสัชกร', '4. พยาบาลวิชาชีพ', '5. พยาบาลเทคนิค', '6. ผู้ช่วยพยาบาล', '7. นักวิทยาศาสตร์การแพทย์', '8. เจ้าพนักงานวิทยาศาสตร์การแพทย์', '9. นักกายภาพบำบัด', '10. นักรังสีการแพทย์', '11. เจ้าพนักงานรังสีการแพทย์', '12. นักวิชาการสาธารณสุข (ทันตสาธารณสุข)', '13. เจ้าพนักงานเภสัชกรรม', '14. นักจิตวิทยา', '15. นักเวชศาสตร์การสื่อความหมาย', '16. นักกายอุปกรณ์', '17. นักกิจกรรมบำบัด', '18. เจ้าพนักงานสาธารณสุข (เวชกิจฉุกเฉิน)/นักปฏิบัติการฉุกเฉินการแพทย์', '19. นักวิชาการสาธารณสุข', '20. เจ้าพนักงานสาธารณสุข', '21. แพทย์แผนไทย', '22. นักวิชาการโสตทัศนศึกษา', '23. นักวิชาการสาธารณสุข (เวชสถิติ)', '24. นักเทคโนโลยีหัวใจและทรวงอก', '25. นักโภชนาการ', '26. นักสังคมสงเคราะห์', '27. อื่น ๆ'] },
      { id: '1.11', text: '1.11 ท่านทำงานเป็นกะ ทำงานเป็นรอบ หรือเข้าเวรหรือไม่', type: 'radio', options: ['1. ไม่ใช่', '2. ทำงานเป็นกะ ทำงานเป็นรอบ หรือเข้าเวร'] },
      { id: '1.12', text: '1.12 ระยะเวลาที่ท่านทำงานในองค์กรจนถึงปัจจุบัน', type: 'radio', options: ['1. ไม่ถึงปี', '2. ระหว่าง 1-2 ปี', '3. ระหว่าง 3-5 ปี', '4. ระหว่าง 6-9 ปี', '5. 10 ปีขึ้นไป'] },
      { id: '1.13', text: '1.13 ตั้งแต่เริ่มทำงานจนถึงปัจจุบัน ท่านเคยย้ายงาน หรือเปลี่ยนงานมาแล้วกี่ครั้ง', type: 'radio', options: ['1. ไม่เคยลาออกย้ายเปลี่ยนงาน', '2. 1-3 ครั้ง', '3. 4-6 ครั้ง', '4. 7-9 ครั้ง', '5. 10 ครั้งขึ้นไป'] },
      { id: '1.14', text: '1.14 ท่านมีรายได้ต่อเดือน โดยประมาณเดือนละเท่าใด (รายได้+เงินเดือน+ค่าตอบแทนอื่นๆ)', type: 'select', options: ['1. น้อยกว่า 10,000 บาท', '2. 10,001-20,000 บาท', '3. 20,001-30,000 บาท', '4. 30,001-40,000 บาท', '5. 40,001-50,000 บาท', '6. 50,001-100,000 บาท', '7. มากกว่า 100,000 บาท'] },
      { id: 'department', text: '1.15 ท่านปฏิบัติงานในกลุ่ม/ฝ่าย/แผนก ใดในหน่วยงานของท่าน (เลือกกลุ่มงานตามโครงสร้างตามประเภทหน่วยงาน)', type: 'select', options: ['ER', 'OPD', 'Ward1', 'Ward2', 'OR', 'LR', 'คลินิกพิเศษ', 'supply', 'งานประกัน', 'ห้องlab+xray', 'บริหาร', 'PCU', 'กายภาพ', 'แผนไทย', 'จิตเวช', 'เภสัชกรรม', 'องค์กรแพทย์'] }
    ]
  },
  {
    id: 'body', title: 'มิติสุขภาพกายดี (Happy Body)', icon: <Activity className="w-5 h-5" />,
    questions: [
      { id: 'q1_weight', text: '1. ปัจจุบัน ท่านมีน้ำหนัก..........กิโลกรัม', type: 'number' },
      { id: 'q1_height', text: 'ส่วนสูง..........เซนติเมตร', type: 'number' },
      { id: 'q1_waist', text: 'เส้นรอบเอว..........นิ้ว', type: 'number' },
      { id: 'q2', text: '2. ปกติท่านทานอาหารเช้า โดยเฉลี่ยสัปดาห์ละกี่วัน', type: 'radio', options: ['1. ไม่ทาน', '2. ทานแต่ไม่บ่อย (1-2 วัน)', '3. ทานเป็นบางครั้ง (3-4 วัน)', '4. ทานเป็นประจำ (5-6 วัน)', '5. ทานทุกวัน'], scores: [0, 25, 50, 75, 100] },
      { id: 'q3', text: '3. ปัจจุบันท่านออกกำลังกาย โดยเฉลี่ยสัปดาห์ละกี่วัน', type: 'radio', options: ['1. ไม่ได้ออกกำลังกาย', '2. น้อยกว่า 3 วันต่อสัปดาห์', '3. จำนวน 3 วันต่อสัปดาห์', '4. มากกว่า 3 วันต่อสัปดาห์', '5. ทุกวัน'], scores: [0, 25, 50, 75, 100] },
      { id: 'q4', text: '4. ปัจจุบันท่านสูบบุหรี่/ใบจาก/ยาเส้น หรือไม่', type: 'radio', options: ['1. สูบเป็นประจำ', '2. สูบบ่อยครั้ง', '3. สูบนานๆ ครั้ง', '4. ไม่สูบแต่เคยสูบ', '5. ไม่เคยสูบเลย'], scores: [0, 25, 50, 75, 100] },
      { id: 'q5', text: '5. ปัจจุบันท่านดื่มเครื่องดื่มแอลกอฮอล์ เช่น เหล้า เบียร์ ไวน์ สาโท หรือสุราพื้นบ้านหรือไม่', type: 'radio', options: ['1. ดื่มเกือบทุกวัน/ทุกสัปดาห์', '2. ดื่มเกือบทุกเดือน', '3. ดื่มปีละ 1-2 ครั้ง', '4. ไม่ดื่มแต่เคยดื่ม', '5. ไม่เคยดื่มเลย'], scores: [0, 25, 50, 75, 100] },
      { id: 'q6', text: '6. ท่านมีความพึงพอใจกับสุขภาพกายของท่านหรือไม่', type: 'likert', labels: ['1. ไม่พอใจเลย/พอใจน้อยที่สุด', '2. พอใจน้อย', '3. พอใจปานกลาง', '4. พอใจมาก', '5. พอใจมากที่สุด'] }
    ]
  },
  { id: 'relax', title: 'มิติผ่อนคลายดี (Happy Relax)', icon: <Moon className="w-5 h-5" />, questions: [
      { id: 'q7', text: '7. ท่านรู้สึกว่าได้รับการพักผ่อนเพียงพอหรือไม่', type: 'likert', labels: ['1. ไม่พอ/น้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q8', text: '8. ใน 1 สัปดาห์ท่านทำกิจกรรมเพื่อเป็นการพักผ่อนหย่อนใจ เช่น อ่านหนังสือ ดูหนัง ฟังเพลง ฯลฯ หรือไม่', type: 'likert', labels: ['1. ไม่ได้ทำ/น้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q9', text: '9. ท่านมีความเครียด เช่น เครียดจากการทำงาน เรื่องครอบครัว หรือเรื่องอื่นๆ บ้างหรือไม่', type: 'likert_reverse_text', scores: [0, 25, 50, 75, 100], labels: ['1. เครียดมากที่สุด', '2. เครียดมาก', '3. เครียดปานกลาง', '4. เครียดน้อย', '5. ไม่เครียดเลย'] }, 
      { id: 'q10', text: '10. ท่านคิดว่าชีวิตของท่านเป็นไปตามที่คาดหวังหรือไม่', type: 'likert', labels: ['1. ไม่เป็นไปตามที่คาดหวังเลย', '2. เป็นไปตามที่คาดหวังเล็กน้อย', '3. เป็นไปตามที่คาดหวังปานกลาง', '4. เป็นไปตามที่คาดหวังมาก', '5. เป็นไปตามที่คาดหวังมากที่สุด'] }, 
      { id: 'q11', text: '11. เมื่อประสบปัญหาในชีวิต โดยทั่วไปท่านสามารถจัดการกับปัญหาได้หรือไม่', type: 'likert', labels: ['1. ไม่สามารถจัดการได้เลย', '2. จัดการได้น้อยมาก', '3. จัดการได้ปานกลาง', '4. จัดการได้มาก', '5. จัดการได้มากที่สุด'] }
    ] 
  },
  { id: 'heart', title: 'มิติน้ำใจดี (Happy Heart)', icon: <Heart className="w-5 h-5" />, questions: [
      { id: 'q12', text: '12. ท่านรู้สึกเอื้ออาทร หรือห่วงใยคนรอบข้างหรือไม่', type: 'likert', labels: ['1. ไม่รู้สึกเลย/น้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q13', text: '13. ท่านให้การช่วยเหลือแก่คนรอบข้างหรือไม่', type: 'likert', labels: ['1. ไม่เคย/แทบจะไม่เคยช่วย', '2. นานๆ ครั้ง', '3. ช่วยบ้างบางครั้ง', '4. ช่วยแทบทุกครั้ง', '5. ช่วยทุกครั้ง'] }, 
      { id: 'q14', text: '14. ท่านเต็มใจและยินดีในการทำประโยชน์เพื่อส่วนรวมหรือไม่', type: 'likert', labels: ['1. ไม่เต็มใจ/เต็มใจน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q15', text: '15. ท่านเข้าร่วมกิจกรรมที่เป็นประโยชน์ต่อสังคม เช่น การปลูกป่า การบริจาคสิ่งของ ฯลฯ', type: 'likert', labels: ['1. ไม่เข้าร่วม/เข้าร่วมน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q16', text: '16. ท่านได้ทำกิจกรรมที่สามารถทำได้ด้วยตนเองและมีประโยชน์ต่อสังคม เช่น การคัดแยกขยะ การลดใช้ถุงพลาสติก ฯลฯ', type: 'likert', labels: ['1. ไม่ทำ/ทำน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }
    ] 
  },
  { id: 'soul', title: 'มิติจิตวิญญาณดี (Happy Soul)', icon: <Sun className="w-5 h-5" />, questions: [
      { id: 'q17', text: '17. ท่านทำนุบำรุงศิลปวัฒนธรรม ศาสนา หรือให้ทานหรือไม่', type: 'likert', labels: ['1. ไม่ทำ/ทำน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q18', text: '18. ท่านปฏิบัติกิจตามศาสนาเพื่อให้จิตใจสงบหรือไม่', type: 'likert', labels: ['1. ไม่ปฏิบัติ/ปฏิบัติน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q19', text: '19. ท่านยกโทษและให้อภัยอย่างจริงใจต่อผู้ที่สำนึกผิดหรือไม่', type: 'likert', labels: ['1. ไม่ยอมรับ/ยกโทษน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q20', text: '20. ท่านยอมรับและขอโทษในความผิดที่ทำ หรือมีส่วนรับผิดชอบหรือไม่', type: 'likert', labels: ['1. ไม่ยอมรับ/ขอโทษน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q21', text: '21. ท่านตอบแทนผู้มีพระคุณที่ช่วยเหลือท่านหรือไม่', type: 'likert', labels: ['1. ไม่ตอบแทน/ตอบแทนน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }
    ] 
  },
  { id: 'family', title: 'มิติครอบครัวดี (Happy Family)', icon: <Home className="w-5 h-5" />, questions: [
      { id: 'q22', text: '22. ท่านมีเวลาอยู่กับครอบครัว เพียงพอหรือไม่', type: 'likert', labels: ['1. ไม่เพียงพอ', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q23', text: '23. ท่านทำกิจกรรมร่วมกันกับคนในครอบครัว เช่น ออกกำลังกาย ทำบุญ ซื้อของ ฯลฯ หรือไม่', type: 'likert', labels: ['1. ไม่ทำ/ทำน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q24', text: '24. ท่านมีความสุขกับครอบครัวของท่านหรือไม่', type: 'likert', labels: ['1. ไม่มี/มีน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }
    ] 
  },
  { id: 'society', title: 'มิติสังคมดี (Happy Society)', icon: <Users className="w-5 h-5" />, questions: [
      { id: 'q25', text: '25. เพื่อนบ้านมีความสัมพันธ์ที่ดีต่อท่านหรือไม่', type: 'likert', labels: ['1. ไม่มี/มีน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q26', text: '26. ท่านปฏิบัติตามกฎระเบียบ ข้อบังคับของสังคมหรือไม่', type: 'likert', labels: ['1. ไม่ปฏิบัติ/ปฏิบัติน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q27', text: '27. ท่านรู้สึกปลอดภัยในชีวิตและทรัพย์สินหรือไม่', type: 'likert', labels: ['1. ไม่รู้สึก/น้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q28', text: '28. เมื่อท่านมีปัญหา ท่านสามารถขอความช่วยเหลือจากคนในชุมชนหรือไม่', type: 'likert', labels: ['1. ไม่ได้/มีน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q29', text: '29. ท่านรู้สึกว่าสังคมไทยทุกวันนี้ มีความสงบสุขหรือไม่', type: 'likert', labels: ['1. ไม่มี/มีน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q30', text: '30. โดยรวมแล้วทุกวันนี้ท่านใช้ชีวิตในสังคมอย่างมีความสุขหรือไม่', type: 'likert', labels: ['1. ไม่มี/มีน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }
    ] 
  },
  { id: 'brain', title: 'มิติใฝ่รู้ดี (Happy Brain)', icon: <BookOpen className="w-5 h-5" />, questions: [
      { id: 'q31', text: '31. ท่านสนใจในการแสวงหาความรู้ใหม่ๆ เพิ่มเติมจากแหล่งความรู้ต่าง ๆ หรือไม่', type: 'likert', labels: ['1. ไม่สนใจ/สนใจน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q32', text: '32. ท่านสนใจที่จะพัฒนาตนเอง เพื่อความก้าวหน้าในชีวิตหรือไม่', type: 'likert', labels: ['1. ไม่สนใจ/สนใจน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q33', text: '33. ท่านมีโอกาสที่จะได้รับการอบรม ศึกษาต่อ หรือดูงาน เพื่อพัฒนาทักษะและความสามารถของตนเองหรือไม่', type: 'likert', labels: ['1. ไม่มีโอกาส/มีโอกาสน้อยที่สุด', '2. มีโอกาสน้อย', '3. มีโอกาสปานกลาง', '4. มีโอกาสมาก', '5. มีโอกาสมากที่สุด'] }
    ] 
  },
  { id: 'money', title: 'มิติสุขภาพเงินดี (Happy Money)', icon: <DollarSign className="w-5 h-5" />, questions: [
      { id: 'q34', text: '34. ท่านรู้สึกว่าการผ่อนชำระหนี้สินต่าง ๆ ในปัจจุบันเป็นภาระหรือไม่ (ถ้าไม่มีตอบ 5)', type: 'likert_custom', labels: ['1. เป็นภาระหนักที่สุด', '2. เป็นภาระหนักมาก', '3. เป็นภาระปานกลาง', '4. เป็นภาระน้อย', '5. ไม่เป็นภาระ/ไม่ได้ผ่อนชำระ/ไม่มีหนี้สิน'] }, 
      { id: 'q35', text: '35. ท่านผ่อนชำระหนี้ตามกำหนดเวลาทุกครั้งหรือไม่', type: 'likert_custom', labels: ['1. ไม่ตรงเวลาทุกครั้ง', '2. ไม่ตรงเวลาบ่อยครั้ง', '3. ตรงเวลาบ้างบางครั้ง', '4. ตรงเวลาเกือบทุกครั้ง', '5. ตรงเวลาทุกครั้ง/ไม่ได้ผ่อนชำระ/ไม่มีหนี้สิน'] }, 
      { id: 'q36', text: '36. ท่านมีเงินเก็บออมในแต่ละเดือนหรือไม่', type: 'likert_custom', labels: ['1. ไม่มี/มีน้อยที่สุด', '2. มี/เก็บออมเพียงเล็กน้อย', '3. มี/เก็บออมปานกลาง', '4. มี/เก็บออมมาก', '5. มี/เก็บออมมากที่สุด'] }, 
      { id: 'q37', text: '37. ค่าตอบแทนที่ท่านได้รับในแต่ละเดือนเป็นอย่างไร เมื่อเปรียบเทียบกับรายจ่ายในแต่ละเดือน', type: 'radio', options: ['1. รายจ่ายเกินกว่ารายได้มาก', '2. รายจ่ายเกินกว่าเล็กน้อย', '3. รายจ่ายพอๆ กับรายได้', '4. รายจ่ายน้อยกว่ารายได้', '5. รายจ่ายน้อยกว่ารายได้มาก'], scores: [0, 25, 50, 75, 100] }
    ] 
  },
  { id: 'worklife', title: 'มิติการงานดี (Happy Work Life)', icon: <Briefcase className="w-5 h-5" />, questions: [
      { id: 'q38', text: '38. งานของท่านมีความท้าทายและส่งเสริมให้ท่านได้เรียนรู้สิ่งใหม่ๆ หรือไม่', type: 'likert', labels: ['1. ไม่มี/มีน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q39', text: '39. งานของท่าน มีความชัดเจนของโอกาสในการเติบโตในตำแหน่งหน้าที่หรือไม่', type: 'likert', labels: ['1. ไม่มี/มีน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q40', text: '40. งานของท่านในขณะนี้มีความมั่นคงหรือไม่', type: 'likert', labels: ['1. ไม่มั่นคง/มั่นคงน้อยที่สุด', '2. มั่นคงน้อย', '3. มั่นคงปานกลาง', '4. มั่นคงมาก', '5. มั่นคงมากที่สุด'] }, 
      { id: 'q41', text: '41. ในการทำงานท่านสามารถแสดงความคิดเห็นและมีส่วนร่วมในข้อเสนอแนะกับผู้บริหาร/หัวหน้างานหรือไม่', type: 'likert', labels: ['1. ไม่มีส่วนร่วม/มีน้อยที่สุด', '2. มีส่วนร่วมบ้างเล็กน้อย', '3. มีส่วนร่วมปานกลาง', '4. มีส่วนร่วมมาก', '5. มีส่วนร่วมมากที่สุด'] }, 
      { id: 'q42', text: '42. ท่านได้รับ การปฏิบัติอย่างถูกต้องตามกฎหมายแรงงาน/ พรบ.ข้าราชการ 2551/ พรบ.แรงงานรัฐวิสาหกิจสัมพันธ์ 2547 และกฎหมายอื่น ๆ จากองค์กรของท่านหรือไม่', type: 'likert', labels: ['1. ไม่ได้เลย/ได้รับน้อยที่สุด', '2. ได้รับเล็กน้อย', '3. ได้รับพอสมควร', '4. ได้รับมาก', '5. ได้รับมากที่สุด'] }, 
      { id: 'q43', text: '43. ท่านได้รับการพิจารณาเลื่อนขั้น เลื่อนตำแหน่ง หรือปรับขึ้นเงินเดือนที่ผ่านมาด้วยความเหมาะสมหรือไม่', type: 'likert', labels: ['1. ไม่เหมาะสม/เหมาะสมน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q44', text: '44. ความถูกต้องของการจ่ายค่าตอบแทน หรือค่าล่วงเวลาที่ท่านได้รับจากองค์กรของท่านเป็นอย่างไร', type: 'likert_custom', labels: ['1. ไม่ถูกต้องทุกครั้ง', '2. ไม่ถูกต้องบ่อยครั้ง', '3. ถูกต้องบ้างเป็นบางครั้ง', '4. ถูกต้องเกือบทุกครั้ง', '5. ถูกต้องทุกครั้ง'] }, 
      { id: 'q45', text: '45. ความตรงเวลาของการจ่ายค่าตอบแทน หรือค่าล่วงเวลาที่ท่านได้รับจากองค์กรของท่านเป็นอย่างไร', type: 'likert_custom', labels: ['1. ไม่ตรงเวลาทุกครั้ง', '2. ไม่ตรงเวลาบ่อยครั้ง', '3. ตรงเวลาบ้างเป็นบางครั้ง', '4. ตรงเวลาเกือบทุกครั้ง', '5. ตรงเวลาทุกครั้ง'] }, 
      { id: 'q46', text: '46. ค่าตอบแทนที่ท่านได้รับคุ้มค่ากับความเสี่ยงที่อาจเกิดจากการทำงาน เช่น การถูกฟ้องร้อง การได้รับอันตรายจากการทำงาน ฯลฯ', type: 'likert', labels: ['1. ไม่คุ้มค่า/คุ้มค่าน้อยที่สุด', '2. คุ้มค่าน้อย', '3. คุ้มค่าปานกลาง', '4. คุ้มค่ามาก', '5. คุ้มค่ามากที่สุด'] }, 
      { id: 'q47', text: '47. ท่านได้รับการดูแลเกี่ยวกับสุขภาพที่ดีจากองค์กรหรือไม่', type: 'likert', labels: ['1. ไม่ได้รับ/ได้รับน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q48', text: '48. ท่านพึงพอใจต่อสภาพแวดล้อมโดยรวมขององค์กรหรือไม่', type: 'likert', labels: ['1. ไม่พอใจเลย/พอใจน้อยที่สุด', '2. พอใจน้อย', '3. พอใจปานกลาง', '4. พอใจมาก', '5. พอใจมากที่สุด'] }, 
      { id: 'q49', text: '49. ท่านพึงพอใจกับสวัสดิการที่องค์กรจัดให้หรือไม่', type: 'likert', labels: ['1. ไม่พอใจเลย/พอใจน้อยที่สุด', '2. พอใจน้อย', '3. พอใจปานกลาง', '4. พอใจมาก', '5. พอใจมากที่สุด'] }, 
      { id: 'q50', text: '50. โดยรวมแล้วที่ทำงานของท่านให้ความสำคัญกับการทำงานเป็นทีมหรือไม่', type: 'likert', labels: ['1. ไม่ให้/ให้น้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q51', text: '51. โดยรวมแล้วความสัมพันธ์ในที่ทำงานของท่านเหมือนพี่เหมือนน้องหรือไม่', type: 'likert', labels: ['1. ไม่เหมือน/เหมือนน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q52', text: '52. ท่านสื่อสารพูดคุยกับเพื่อนร่วมงานในที่ทำงานหรือไม่', type: 'likert', labels: ['1. ไม่สื่อสารเลย/สื่อสารน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q53', text: '53. โดยรวมแล้วในที่ทำงานของท่านมีการถ่ายทอดแลกเปลี่ยนแบบอย่างการทำงานระหว่างกันหรือไม่', type: 'likert', labels: ['1. ไม่มี/มีน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q54', text: '54. โดยรวมแล้วท่านทำงานอย่าง “มีความสุข” หรือไม่', type: 'likert', labels: ['1. ไม่มี/มีน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }
    ] 
  },
  { id: 'engagement', title: 'ความผูกพัน (Engagement)', icon: <Award className="w-5 h-5" />, questions: [
      { id: 'q55', text: '55. ท่านจะแนะนำญาติ เพื่อน หรือคนรู้จักมาทำงานที่องค์กรของท่านหรือไม่ (Say)', type: 'likert', labels: ['1. ไม่/แนะนำน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q56', text: '56. หากมีใครกล่าวถึงองค์กรในทางที่ไม่เหมาะสม ท่านจะปกป้ององค์กรของท่านหรือไม่ (Say)', type: 'likert', labels: ['1. ไม่/ปกป้องน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q57', text: '57. ท่านภาคภูมิใจที่ได้เป็นบุคลากรขององค์กรที่ได้ทำงานในองค์กรนี้หรือไม่ (Strive)', type: 'likert', labels: ['1. ไม่ภาคภูมิใจ/ภูมิใจน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q58', text: '58. ขณะที่ทำงานอยู่ในองค์กรนี้ หากท่านมีโอกาสได้ศึกษาต่อและเมื่อสำเร็จการศึกษาแล้ว ท่านจะทำงานต่อหรือว่าลาออก (Stay)', type: 'radio', options: ['1. ลาออกแน่นอน', '2. อาจจะลาออก', '3. น่าจะลาออก', '4. ไม่ลาออก', '5. ไม่ลาออกแน่นอน'], scores: [0, 25, 50, 75, 100] }, 
      { id: 'q59', text: '59. ถ้าท่านมีโอกาสเปลี่ยนสถานที่ทำงาน หรือองค์กรอื่นชวน หรือติดต่อไปทำงาน ท่านพร้อมที่จะไปหรือไม่ (Stay)', type: 'radio', options: ['1. ไปแน่นอน/ไปทันที', '2. คิดว่าจะไป', '3. ไม่แน่ใจ', '4. ไม่ไป', '5. ไม่ไปแน่นอน'], scores: [0, 25, 50, 75, 100] }, 
      { id: 'q60', text: '60. ท่านรู้สึกเป็นเจ้าของงานร่วมขององค์กรที่ท่านทำงานในปัจจุบันหรือไม่ (Strive)', type: 'likert', labels: ['1. ไม่/ทุ่มเทน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q61', text: '61. ท่านทุ่มเททำงานเพื่อประโยชน์ขององค์การของท่านหรือไม่ (Strive)', type: 'likert', labels: ['1. ไม่/ทุ่มเทน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q62', text: '62. ท่านเป็นคน คิดใหม่ ทำใหม่ เพื่อสร้างความก้าวหน้าให้กับองค์กรของท่านหรือไม่ (Strive)', type: 'likert', labels: ['1. ไม่/น้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q63', text: '63. ในแต่ละวัน ท่านทำงานอย่างมีเป้าหมาย หรือไม่ (Strive)', type: 'likert', labels: ['1. ไม่/น้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }
    ] 
  },
  { id: 'balance', title: 'สมดุลชีวิตกับการทำงาน (Work Life Balance)', icon: <Clock className="w-5 h-5" />, questions: [
      { id: 'q64', text: '64. ท่านรู้สึกว่าโดยเฉลี่ยในหนึ่งสัปดาห์ท่านทำงานกี่วัน', type: 'radio', options: ['1. ทำงาน 1-2 วัน', '2. ทำงาน 3-4 วัน', '3. ทำงาน 5 วัน', '4. ทำงาน 6 วัน', '5. ทำงาน 7 วัน (ทุกวัน)'], scores: [50, 75, 100, 50, 0] }, 
      { id: 'q65', text: '65. ท่านรู้สึกว่าโดยเฉลี่ยท่านทำงานวันละกี่ชั่วโมง', type: 'radio', options: ['1. น้อยกว่า 6 ชั่วโมง', '2. 6-8 ชั่วโมง', '3. 9-10 ชั่วโมง', '4. 11-12 ชั่วโมง', '5. มากกว่า 12 ชั่วโมง'], scores: [50, 100, 75, 50, 0] }, 
      { id: 'q66', text: '66. ท่านรู้สึกว่าได้พักผ่อนโดยเฉลี่ย วันละกี่ชั่วโมง (ไม่รวมการนอนหลับตอนกลางคืน)', type: 'radio', options: ['1. น้อยกว่า 1 ชั่วโมง', '2. 1-2 ชั่วโมง', '3. 3-5 ชั่วโมง', '4. 6-7 ชั่วโมง', '5. 8 ชั่วโมง'], scores: [0, 25, 50, 75, 100] }, 
      { id: 'q67', text: '67. หน่วยงานของท่าน มีความยืดหยุ่น ในการทำงานหรือไม่ เช่น ความยืดหยุ่นในการทำงานนอกสถานที่ ไม่ต้องเข้า-ออกงานตามเวลาที่กำหนด ฯลฯ', type: 'likert', labels: ['1. ไม่มี/มีน้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q68', text: '68. ท่านทำงานตรงตามวุฒิการศึกษาหรือไม่', type: 'likert', labels: ['1. ไม่ตรงตามวุฒิ/น้อยที่สุด', '2. น้อย', '3. ปานกลาง', '4. มาก', '5. มากที่สุด'] }, 
      { id: 'q69', text: '69. ปัจจุบัน “ความสุขของท่าน” อยู่ในระดับใด โดยคะแนนจะเรียงจากน้อยไปหามาก เริ่มจาก 1 หมายถึง ไม่มีความสุขเลย ไปจนถึง 10 หมายถึงมีความสุขที่สุด', type: 'slider', min: 1, max: 10 }
    ] 
  }
];

// --- Helpers ---

// Calculate generation based on age
const calculateGen = (age) => {
    const a = parseInt(age);
    if(!a) return "Unknown";
    if(a >= 60) return "Baby Boomer";
    if(a >= 43) return "Gen X";
    if(a >= 26) return "Gen Y";
    return "Gen Z";
};

// Helper to extract number from string (e.g. "1. ..." -> 1)
const extractVal = (v) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
      const match = v.match(/^(\d+)\./);
      return match ? parseInt(match[1]) : null;
  }
  return null;
};

// Updated Calculate Question Score based on 1=0, 2=25...
const calculateQuestionScore = (q, val) => {
    if (val === undefined || val === null) return 0;
    
    // Likert & Likert Custom: 1=0, 2=25, 3=50, 4=75, 5=100
    if (q.type.includes('likert')) {
        const intVal = extractVal(val);
        if (intVal !== null) { 
            // Formula: (Value - 1) * 25
            // 1 -> 0
            // 2 -> 25
            // 3 -> 50
            // 4 -> 75
            // 5 -> 100
            return (intVal - 1) * 25; 
        }
    } 
    // Radio with specific scores array (e.g. [0, 25, 50, 75, 100])
    else if (q.scores) {
        const index = q.options.indexOf(val);
        if (index !== -1) { return q.scores[index]; }
    } 
    // Slider 1-10 -> 0-100
    else if (q.type === 'slider') {
        const intVal = parseInt(val);
        if (!isNaN(intVal)) { return (intVal - 1) * (100/9); }
    }
    return 0;
};

const calculateSectionScore = (sectionId, answers) => {
  const section = SECTIONS.find(s => s.id === sectionId);
  if (!section || sectionId.startsWith('personal')) return 0;
  let totalScore = 0; let count = 0;
  section.questions.forEach(q => {
    // Skip Body Q1 (weight/height/waist)
    if(sectionId === 'body' && q.id.startsWith('q1_')) return; 
    
    // Skip Balance Q69 (Overall Happiness) as requested
    if(sectionId === 'balance' && q.id === 'q69') return;

    const val = answers[q.id];
    if (val !== undefined && val !== null) {
      const s = calculateQuestionScore(q, val);
      totalScore += s; 
      count++;
    }
  });
  return count > 0 ? (totalScore / count) : 0;
};

// Helper for Dimension Scores (e.g. Say, Stay, Strive)
const calculateDimensionScore = (questionIds, answers) => {
    let totalScore = 0;
    let count = 0;
    const allQuestions = SECTIONS.flatMap(s => s.questions);
  
    questionIds.forEach(qid => {
      const q = allQuestions.find(i => i.id === qid);
      const val = answers[qid];
      if (q && val !== undefined && val !== null) {
         const s = calculateQuestionScore(q, val);
         totalScore += s;
         count++;
      }
    });
    return count > 0 ? (totalScore / count) : 0;
};

// Helper for Specific Range Average (Q2-Q54)
const calculateRangeAverage = (startId, endId, answers) => {
    let totalScore = 0;
    let count = 0;
    const allQuestions = SECTIONS.flatMap(s => s.questions);
    
    // Parse IDs (e.g. 'q2' -> 2)
    const startNum = parseInt(startId.replace('q', ''));
    const endNum = parseInt(endId.replace('q', ''));

    allQuestions.forEach(q => {
        if (!q.id.startsWith('q')) return;
        // Check if ID is in range (e.g. q2 ... q54) - exclude special ids like q1_weight
        const qNum = parseInt(q.id.replace('q', ''));
        if (!isNaN(qNum) && qNum >= startNum && qNum <= endNum) {
             const val = answers[q.id];
             if (val !== undefined && val !== null) {
                 const s = calculateQuestionScore(q, val);
                 totalScore += s;
                 count++;
             }
        }
    });
    return count > 0 ? (totalScore / count) : 0;
}


// --- Components ---

const LikertScale = ({ id, value, onChange, labels }) => {
  return (
    <div className="my-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 sm:space-x-2">
        {labels.map((label, index) => {
          const score = index + 1;
          const isSelected = value === label; 
          
          return (
             <label key={score} className={`w-full sm:w-1/5 flex sm:flex-col items-center p-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-green-100 sm:bg-transparent opacity-100' : 'hover:bg-gray-100 sm:hover:bg-transparent opacity-80 hover:opacity-100'} border sm:border-0 border-gray-200 mb-2 sm:mb-0`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center mr-3 sm:mr-0 sm:mb-2 transition-all ${isSelected ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 bg-white text-gray-500 group-hover:border-green-400'}`}>
                    {score}
                </div>
                <input type="radio" name={id} value={label} checked={isSelected} onChange={(e) => onChange(id, e.target.value)} className="hidden" />
                <span className={`text-sm sm:text-xs text-left sm:text-center flex-1 ${isSelected ? 'font-bold text-green-800' : 'text-gray-600'}`}>
                    {label.replace(/^\d+\.\s*/, '')}
                </span>
             </label>
          );
        })}
      </div>
    </div>
  );
};

// --- Sub-View Components ---

const LandingView = ({ onStart, onDashboard }) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-8 border-green-600">
        <div className="flex justify-center mb-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                <Smile className="w-12 h-12 sm:w-14 sm:h-14 text-green-600" />
            </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2">HAPPINOMETER</h1>
        <p className="text-gray-600 mb-6 text-base sm:text-lg">แบบประเมินความสุขด้วยตนเอง<br/>สำหรับบุคลากรกระทรวงสาธารณสุข</p>
        
        <div className="space-y-4">
          <button onClick={onStart} className="w-full flex items-center justify-center px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all transform hover:scale-105 shadow-md font-bold text-lg">
            <FileText className="w-6 h-6 mr-3" /> เริ่มทำแบบประเมิน
          </button>
          <button onClick={onDashboard} className="w-full flex items-center justify-center px-6 py-4 bg-white text-green-700 border-2 border-green-600 rounded-xl hover:bg-green-50 transition-colors font-bold text-lg">
            <BarChart2 className="w-6 h-6 mr-3" /> ผลวิเคราะห์ภาพรวม (รพ.)
          </button>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-100">
             <p className="text-sm font-semibold text-gray-500">โรงพยาบาลสอยดาว</p>
             <p className="text-xs text-gray-400">จ.จันทบุรี • กระทรวงสาธารณสุข</p>
        </div>
      </div>
    </div>
);

const SurveyView = ({ answers, onAnswer, onSubmit, isSubmitting, onCancel }) => {
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};
        let firstErrorId = null;

        SECTIONS.forEach(section => {
            section.questions.forEach(q => {
                if (q.condition && !q.condition(answers)) return;
                const val = answers[q.id];
                if (q.type !== 'slider' && (val === undefined || val === null || (typeof val === 'string' && val.trim() === ''))) {
                    newErrors[q.id] = true;
                    if (!firstErrorId) firstErrorId = q.id;
                }
            });
        });

        setErrors(newErrors);
        
        if (firstErrorId) {
            const element = document.getElementById(firstErrorId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }
        return true;
    };

    const handleFormSubmit = () => {
        if (validateForm()) {
            onSubmit();
        }
    };

    const handleFieldChange = (id, value) => {
        onAnswer(id, value);
        if (errors[id]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    };

    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white p-4 sticky top-0 z-20 shadow-md flex justify-between items-center">
            <div>
                <h2 className="font-bold text-base sm:text-lg text-green-700">แบบประเมินความสุข</h2>
                <p className="text-xs text-gray-500">กรุณากรอกข้อมูลให้ครบถ้วน</p>
            </div>
            <button onClick={onCancel} className="text-red-500 text-sm font-medium px-3 py-1 hover:bg-red-50 rounded">ออก</button>
        </div>

        <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-6 sm:space-y-8">
            {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm flex items-center animate-pulse sticky top-20 z-10">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <p className="text-sm">กรุณากรอกข้อมูลในช่องสีแดงให้ครบถ้วน</p>
                </div>
            )}

            {SECTIONS.map((section) => (
                <div key={section.id} className="bg-white rounded-xl shadow-sm overflow-hidden scroll-mt-24" id={section.id}>
                    <div className="bg-green-50 p-4 border-b border-green-100 flex items-center">
                        <div className="p-2 bg-white rounded-lg text-green-600 mr-3 shadow-sm">
                            {section.icon}
                        </div>
                        <h3 className="font-bold text-base sm:text-lg text-gray-800">{section.title}</h3>
                    </div>
                    
                    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
                        {section.questions.map(q => {
                            if (q.condition && !q.condition(answers)) return null;
                            const hasError = errors[q.id];

                            return (
                                <div key={q.id} id={q.id} className={`scroll-mt-32 p-3 sm:p-4 rounded-lg transition-colors ${hasError ? 'bg-red-50 border border-red-300' : ''}`}>
                                    <label className={`block font-bold mb-3 text-gray-800 text-base sm:text-lg ${hasError ? 'text-red-700' : ''}`}>
                                        {q.text} <span className="text-red-500">*</span>
                                    </label>
                                    
                                    {q.type === 'text' && (
                                        <input 
                                            type="text" 
                                            className={`w-full p-3 border rounded-lg focus:ring-2 outline-none text-base ${hasError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-green-500'}`} 
                                            value={answers[q.id] || ''} 
                                            onChange={e => handleFieldChange(q.id, e.target.value)} 
                                            placeholder={q.placeholder} 
                                        />
                                    )}

                                    {/* Textarea for Name */}
                                    {q.type === 'textarea' && (
                                        <textarea 
                                            className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-shadow text-base ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                            rows={3}
                                            value={answers[q.id] || ''}
                                            onChange={(e) => handleFieldChange(q.id, e.target.value)}
                                            placeholder={q.placeholder}
                                        />
                                    )}
                                    
                                    {q.type === 'number' && (
                                        <input 
                                            type="number" 
                                            className={`w-full p-3 border rounded-lg focus:ring-2 outline-none text-base ${hasError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-green-500'}`} 
                                            value={answers[q.id] || ''} 
                                            onChange={e => handleFieldChange(q.id, e.target.value)} 
                                            placeholder={q.placeholder || "ระบุตัวเลข"} 
                                        />
                                    )}

                                    {q.type === 'select' && (
                                        <div className="relative">
                                            <select 
                                                className={`w-full p-3 border rounded-lg bg-white appearance-none cursor-pointer focus:ring-2 outline-none text-base ${hasError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-green-500'}`} 
                                                value={answers[q.id] || ''} 
                                                onChange={e => handleFieldChange(q.id, e.target.value)}
                                            >
                                                <option value="">-- กรุณาเลือก --</option>
                                                {q.options.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500"><ChevronRight className="w-5 h-5 rotate-90" /></div>
                                        </div>
                                    )}
                                    
                                    {q.type === 'radio' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {q.options.map(o => (
                                                <label key={o} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${answers[q.id] === o ? 'bg-green-50 border-green-500 ring-1 ring-green-500' : 'hover:bg-gray-50 border-gray-200'} ${hasError ? 'border-red-300 bg-white' : ''}`}>
                                                    <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center flex-shrink-0 ${answers[q.id] === o ? 'border-green-600' : 'border-gray-300'}`}>
                                                        {answers[q.id] === o && <div className="w-2.5 h-2.5 rounded-full bg-green-600" />}
                                                    </div>
                                                    <input type="radio" name={q.id} value={o} checked={answers[q.id] === o} onChange={e => handleFieldChange(q.id, e.target.value)} className="hidden"/>
                                                    <span className="text-gray-700 text-sm sm:text-base">{o}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {(q.type.includes('likert')) && (
                                        <div className={hasError ? 'opacity-100' : ''}>
                                            <LikertScale id={q.id} value={answers[q.id]} onChange={(id, val) => handleFieldChange(id, val)} labels={q.labels} />
                                        </div>
                                    )}
                                    
                                    {q.type === 'slider' && (
                                        <div className="px-2 pt-4">
                                            <input type="range" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600" min={q.min} max={q.max} value={answers[q.id] || q.min} onChange={e => handleFieldChange(q.id, e.target.value)} />
                                            <div className="flex justify-between mt-2 text-sm font-medium text-gray-600">
                                                <span>{q.min} (น้อยที่สุด)</span>
                                                <span className="text-2xl text-green-600 font-bold">{answers[q.id] || q.min}</span>
                                                <span>{q.max} (มากที่สุด)</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg z-30 flex justify-center safe-area-bottom">
                <button 
                    onClick={handleFormSubmit} 
                    disabled={isSubmitting} 
                    className="w-full max-w-md px-8 py-4 bg-green-600 text-white rounded-xl font-bold text-lg shadow-md hover:bg-green-700 transition-transform transform hover:scale-105 disabled:opacity-70 disabled:scale-100 flex items-center justify-center"
                >
                    {isSubmitting ? <RefreshCw className="animate-spin mr-2" /> : <Save className="mr-2" />}
                    {isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'ส่งแบบประเมิน'}
                </button>
            </div>
        </div>
      </div>
    );
};

const ResultView = ({ analysisResult, onDashboard }) => {
    if (!analysisResult) return null;
    const { overallAvg, happiness, engagement, balance } = analysisResult;
    
    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <div className="bg-white p-6 sticky top-0 z-20 shadow-md">
                <h2 className="text-xl font-bold text-center text-green-800">ผลการประเมินความสุข</h2>
                <div className="mt-4 flex flex-col items-center">
                    <div className="w-32 h-32 rounded-full border-8 border-green-100 flex items-center justify-center bg-white shadow-sm mb-2">
                        <div className="text-center">
                            <span className="block text-3xl font-bold text-green-600">{overallAvg.toFixed(2)}</span>
                            <span className="text-xs text-gray-400">คะแนนเฉลี่ยรวม</span>
                        </div>
                    </div>
                    <p className="text-gray-600 font-medium">{getInterpretation(overallAvg).label}</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-6">
                
                {/* Happiness Scores */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-green-600 px-4 py-3">
                        <h3 className="text-white font-bold">คะแนนรายมิติ (Happiness)</h3>
                    </div>
                    <div className="divide-y">
                        {happiness.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-4 hover:bg-gray-50">
                                <span className="font-medium text-gray-700">{item.category}</span>
                                <span className={`font-bold ${item.score >= 50 ? 'text-green-600' : 'text-orange-500'}`}>{item.score.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Engagement Scores */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-blue-600 px-4 py-3 flex justify-between items-center">
                        <h3 className="text-white font-bold">ความผูกพัน (Engagement)</h3>
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">Overall: {engagement.overall.toFixed(2)}</span>
                    </div>
                    <div className="divide-y">
                        {engagement.dims.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-4 hover:bg-gray-50">
                                <span className="font-medium text-gray-700">{item.name}</span>
                                <span className="font-bold text-blue-600">{item.score.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Balance Score */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden p-4 flex justify-between items-center">
                    <span className="font-bold text-gray-700 flex items-center"><Clock className="w-5 h-5 mr-2 text-purple-500"/> Work Life Balance</span>
                    <span className="font-bold text-2xl text-purple-600">{balance.toFixed(2)}</span>
                </div>

                <div className="pt-4 pb-8">
                    <button onClick={onDashboard} className="w-full py-4 bg-gray-800 text-white rounded-xl shadow-lg hover:bg-gray-700 transition-colors font-bold flex items-center justify-center">
                        <BarChart2 className="w-5 h-5 mr-2" /> ดู Dashboard เปรียบเทียบ
                    </button>
                </div>
            </div>
        </div>
    );
};

const DashboardView = ({ loadingData, dashboardStats, rawSheetData, selectedYear, setSelectedYear, onBack }) => {
    if (loadingData) return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="animate-spin mr-2"/> กำลังโหลดข้อมูลจริงจาก Google Sheet...</div>;
    // Fallback to Mock Data if no stats (e.g. fetch failed)
    const stats = dashboardStats || MOCK_DASHBOARD_DATA;
    const radarData = stats.happiness.map(d => ({ subject: d.category.replace('Happy ', ''), A: d.score, fullMark: 100 }));

    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-20">
            <h1 className="font-bold text-base sm:text-lg">Real-time Dashboard (รพ.สอยดาว)</h1>
            <button onClick={onBack} className="text-sm bg-gray-100 px-3 py-1 rounded">กลับ</button>
        </div>
        
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
            <div className="bg-blue-600 text-white p-6 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold">สรุปผลภาพรวม</h2>
                    <p className="opacity-90">จำนวนผู้ตอบ: {rawSheetData ? rawSheetData.length : "N/A"} คน</p>
                </div>
                <div className="text-center sm:text-right">
                    <p className="text-sm opacity-80">คะแนนเฉลี่ยรวม</p>
                    <p className="text-4xl sm:text-5xl font-bold">{(stats.happiness.reduce((a,b)=>a+b.score,0)/9).toFixed(2)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h3 className="font-bold mb-4 text-center sm:text-left">9 มิติความสุข</h3>
                    {/* Reduce height on mobile to fit screen better */}
                    <div className="h-64 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid /><PolarAngleAxis dataKey="subject" tick={{fontSize: 12}} /><PolarRadiusAxis angle={30} domain={[0, 100]} />
                                <Radar name="Score" dataKey="A" stroke="#16a34a" fill="#16a34a" fillOpacity={0.4} />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                        <h3 className="font-bold mb-4">แยกตามหน่วยงาน (Top 5)</h3>
                        <div className="h-64 sm:h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.byDepartment.slice(0,5)} layout="vertical" margin={{left: 0, right: 30}}>
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize:11}} />
                                    <Tooltip />
                                    <Bar dataKey="score" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} label={{position:'right', fill: '#333'}} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h4 className="font-bold text-gray-600 mb-2">แยกตามเพศ</h4>
                    {stats.byGender.map(g => (
                        <div key={g.name} className="flex justify-between border-b py-2 last:border-0">
                            <span>{g.name}</span><span className="font-bold">{g.score}</span>
                        </div>
                    ))}
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h4 className="font-bold text-gray-600 mb-2">แยกตามอายุ (Gen)</h4>
                    {stats.byGeneration && stats.byGeneration.map(g => (
                        <div key={g.name} className="flex justify-between border-b py-2 last:border-0">
                            <span>{g.name}</span><span className="font-bold">{g.score}</span>
                        </div>
                    ))}
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h4 className="font-bold text-gray-600 mb-2">แยกตามการจ้างงาน</h4>
                    {stats.byEmployment.map(g => (
                        <div key={g.name} className="flex justify-between border-b py-2 last:border-0">
                            <span className="text-sm">{g.name}</span><span className="font-bold">{g.score}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    );
};

// --- Main App Component ---

export default function App() {
  const [view, setView] = useState('landing');
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState("2567");
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // Real Data State
  const [rawSheetData, setRawSheetData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);

  // Define helper functions outside components if they don't depend on state/props, 
  // or wrap in useCallback inside component.
  // calculateGen is pure, defined above.

  const processSheetData = useCallback((data) => {
    if (!data || data.length === 0) return;
    const avg = (items, key) => {
        const valid = items.filter(i => i[key] !== undefined && i[key] !== "");
        if (valid.length === 0) return 0;
        const sum = valid.reduce((acc, curr) => acc + (parseFloat(curr[key]) || 0), 0);
        return sum / valid.length;
    };
    const groupByAvg = (items, groupKey, scoreKey) => {
        const groups = {};
        items.forEach(i => {
            const g = i[groupKey] || "ไม่ระบุ";
            if (!groups[g]) groups[g] = [];
            groups[g].push(i);
        });
        return Object.keys(groups).map(g => ({
            name: g,
            score: parseFloat(avg(groups[g], scoreKey).toFixed(2))
        })).sort((a, b) => b.score - a.score);
    };
    const processedData = data.map(item => ({ ...item, "Generation": calculateGen(item["1.2 อายุ"]) }));
    
    const stats = {
        happiness: [
            { category: "Happy Body", score: avg(data, "Happy Body Score") },
            { category: "Happy Relax", score: avg(data, "Happy Relax Score") },
            { category: "Happy Heart", score: avg(data, "Happy Heart Score") },
            { category: "Happy Soul", score: avg(data, "Happy Soul Score") },
            { category: "Happy Family", score: avg(data, "Happy Family Score") },
            { category: "Happy Society", score: avg(data, "Happy Society Score") },
            { category: "Happy Brain", score: avg(data, "Happy Brain Score") },
            { category: "Happy Money", score: avg(data, "Happy Money Score") },
            { category: "Happy Work Life", score: avg(data, "Happy Work Life Score") },
        ].map(s => ({...s, score: parseFloat(s.score.toFixed(2))})),
        engagement: {
            overall: parseFloat(avg(data, "Engagement Overall Score").toFixed(2)),
            dims: [
                { name: "Say", score: parseFloat(avg(data, "Engage: Say Score").toFixed(2)) },
                { name: "Stay", score: parseFloat(avg(data, "Engage: Stay Score").toFixed(2)) },
                { name: "Strive", score: parseFloat(avg(data, "Engage: Strive Score").toFixed(2)) },
            ]
        },
        balance: parseFloat(avg(data, "Work Life Balance Score").toFixed(2)),
        byDepartment: groupByAvg(data, "1.15 หน่วยงาน/แผนก", "Overall Happiness Avg"),
        byGender: groupByAvg(data, "1.1 เพศ", "Overall Happiness Avg"),
        byJobType: groupByAvg(data, "1.7 ลักษณะงาน", "Overall Happiness Avg"),
        byPosition: groupByAvg(data, "1.8 ระดับตำแหน่ง", "Overall Happiness Avg"),
        byEmployment: groupByAvg(data, "1.9 การจ้างงาน", "Overall Happiness Avg"),
        byJobLine: groupByAvg(data, "1.10 สายงาน", "Overall Happiness Avg"),
        byGeneration: groupByAvg(processedData, "Generation", "Overall Happiness Avg"),
    };
    setDashboardStats(stats);
  }, []); // No dependencies for processSheetData as it uses pure functions/variables

  // Fetch Data logic
  const fetchSheetData = useCallback(async () => {
    if (!GOOGLE_SCRIPT_URL) return;
    setLoadingData(true);
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        setRawSheetData(data);
        processSheetData(data);
    } catch (e) {
        console.error("Failed to fetch data", e);
        // Fallback for demo purposes if fetch fails (CORS etc)
        // setDashboardStats(MOCK_DASHBOARD_DATA); 
    } finally {
        setLoadingData(false);
    }
  }, [processSheetData]);

  useEffect(() => {
      if (view === 'dashboard') {
          fetchSheetData();
      }
  }, [view, fetchSheetData]);
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // 1. Calculate Standard Happiness Sections (Body, Relax, etc.)
    const happinessScores = SECTIONS.filter(s => SECTION_ID_MAP[s.id]).map(s => ({
        category: SECTION_ID_MAP[s.id], // Use English Name for Backend
        score: calculateSectionScore(s.id, answers),
        fullMark: 100
    }));

    // 2. Calculate Engagement Scores
    const engagementOverall = calculateSectionScore('engagement', answers);
    
    // 3. Calculate Engagement Dimensions (Say, Stay, Strive)
    const sayScore = calculateDimensionScore(ENGAGEMENT_MAPPING.say, answers);
    const stayScore = calculateDimensionScore(ENGAGEMENT_MAPPING.stay, answers);
    const striveScore = calculateDimensionScore(ENGAGEMENT_MAPPING.strive, answers);

    // 4. Calculate Work Life Balance
    const balanceScore = calculateSectionScore('balance', answers);

    // 5. Calculate Overall Happiness Avg (Q2-Q54)
    const overallAvg = calculateRangeAverage('q2', 'q54', answers);
    
    const result = {
        happiness: happinessScores,
        engagement: { 
            overall: engagementOverall, 
            dims: [
                { name: "Say", score: sayScore },
                { name: "Stay", score: stayScore },
                { name: "Strive", score: striveScore }
            ] 
        },
        balance: balanceScore,
        overallAvg: overallAvg
    };
    setAnalysisResult(result);

    // Payload sending full answers text (no cleaning)
    const payload = { timestamp: new Date().toISOString(), hospital: 'โรงพยาบาลสอยดาว', answers: answers, analysis: result };
    
    if (GOOGLE_SCRIPT_URL) {
        try { await fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); } catch (e) { console.error(e); }
    } else { await new Promise(r => setTimeout(r, 1000)); }
    setIsSubmitting(false); setView('result');
  };

  return (
    <div className="font-sans text-gray-800 antialiased bg-gray-50 min-h-screen">
      {view === 'landing' && <LandingView onStart={() => setView('survey')} onDashboard={() => setView('dashboard')} />}
      {view === 'survey' && <SurveyView answers={answers} onAnswer={(id, val) => setAnswers(prev => ({...prev, [id]: val}))} onSubmit={handleSubmit} isSubmitting={isSubmitting} onCancel={() => setView('landing')} />}
      {view === 'result' && <ResultView analysisResult={analysisResult} onDashboard={() => setView('dashboard')} />}
      {view === 'dashboard' && <DashboardView loadingData={loadingData} dashboardStats={dashboardStats} rawSheetData={rawSheetData} selectedYear={selectedYear} setSelectedYear={setSelectedYear} onBack={() => setView('landing')} />}
    </div>
  );
}