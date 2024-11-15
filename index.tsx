"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, Trash2, Download } from 'lucide-react'
import { stringify } from 'csv-stringify/sync'

interface Student {
  序號: string
  姓名: string
  班級: string
  email: string
}

interface Teacher {
  序號: string
  姓名: string
  時薪: string
}

interface LessonRecord {
  id: string
  studentName: string
  teacherName: string
  hours: number
  minutes: number
  date: Date
}

export default function TableTennisTracker() {
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [lessonRecords, setLessonRecords] = useState<LessonRecord[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [hours, setHours] = useState<number>(0)
  const [minutes, setMinutes] = useState<number>(0)
  const [date, setDate] = useState<Date>(new Date())
  const [filterStudent, setFilterStudent] = useState<string>('_all')
  const [filterTeacher, setFilterTeacher] = useState<string>('_all')
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [studentsResponse, teachersResponse] = await Promise.all([
          fetch('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/students-1CGfw6jI4Kbxgt4OfupksyyexuLsjo.csv'),
          fetch('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/teachers-IJ1SDMufncRF9JDeVg0W6zAueCPsZK.csv')
        ])

        const studentsText = await studentsResponse.text()
        const teachersText = await teachersResponse.text()

        const parsedStudents = parseCSV(studentsText)
        const parsedTeachers = parseCSV(teachersText)

        setStudents(parsedStudents)
        setTeachers(parsedTeachers)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "錯誤",
          description: "無法載入學生或教練資料。請稍後再試。",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const parseCSV = useCallback((csv: string): any[] => {
    const lines = csv.split('\n')
    const headers = lines[0].split(',')
    return lines.slice(1).map(line => {
      const values = line.split(',')
      return headers.reduce((obj: any, header, index) => {
        obj[header.trim()] = values[index]?.trim()
        return obj
      }, {})
    }).filter(obj => Object.values(obj).some(value => value))
  }, [])

  const addLessonRecord = useCallback(() => {
    if (selectedStudent && selectedTeacher && (hours > 0 || minutes > 0)) {
      const newRecord: LessonRecord = {
        id: Date.now().toString(),
        studentName: selectedStudent,
        teacherName: selectedTeacher,
        hours,
        minutes,
        date
      }
      setLessonRecords(prevRecords => [...prevRecords, newRecord])
      sendEmail(selectedStudent, 'add')
      resetForm()
      toast({
        title: "成功",
        description: "課程記錄已新增。",
      })
    } else {
      toast({
        title: "錯誤",
        description: "請填寫所有必要資訊。",
        variant: "destructive",
      })
    }
  }, [selectedStudent, selectedTeacher, hours, minutes, date])

  const deleteLessonRecord = useCallback((id: string) => {
    const recordToDelete = lessonRecords.find(record => record.id === id)
    if (recordToDelete) {
      setLessonRecords(prevRecords => prevRecords.filter(record => record.id !== id))
      sendEmail(recordToDelete.studentName, 'delete')
      toast({
        title: "成功",
        description: "課程記錄已刪除。",
      })
    }
  }, [lessonRecords])

  const resetForm = useCallback(() => {
    setSelectedStudent('')
    setSelectedTeacher('')
    setHours(0)
    setMinutes(0)
    setDate(new Date())
  }, [])

  const sendEmail = useCallback((studentName: string, action: 'add' | 'delete') => {
    const student = students.find(s => s.姓名 === studentName)
    if (student) {
      console.log(`Sending email to ${student.email}: Lesson ${action === 'add' ? 'added' : 'deleted'}`)
      // In a real application, you would call an API to send an email here
    }
  }, [students])

  const filteredRecords = useMemo(() => {
    return lessonRecords.filter(record => {
      const studentMatch = !filterStudent || filterStudent === '_all' || record.studentName === filterStudent
      const teacherMatch = !filterTeacher || filterTeacher === '_all' || record.teacherName === filterTeacher
      const dateMatch = !filterDate || format(record.date, 'yyyy-MM-dd') === format(filterDate, 'yyyy-MM-dd')
      return studentMatch && teacherMatch && dateMatch
    })
  }, [lessonRecords, filterStudent, filterTeacher, filterDate])

  const exportToCSV = useCallback(() => {
    const csvData = filteredRecords.map(record => ({
      日期: format(record.date, 'yyyy-MM-dd'),
      學生: record.studentName,
      教練: record.teacherName,
      時數: `${record.hours}小時${record.minutes}分鐘`,
    }))

    const csvString = stringify(csvData, { header: true })
    const BOM = '\uFEFF'
    const csvStringWithBOM = BOM + csvString
    const blob = new Blob([csvStringWithBOM], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', '桌球課程記錄.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }, [filteredRecords])

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">載入中...</div>
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">桌球課程記錄系統</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="student">學生</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇學生" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.序號} value={student.姓名 || `student_${student.序號}`}>
                      {student.姓名} - {student.班級}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="teacher">教練</Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇教練" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.序號} value={teacher.姓名 || `teacher_${teacher.序號}`}>
                      {teacher.姓名} - {teacher.時薪}元/小時
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="hours">練習時間</Label>
              <div className="flex space-x-2">
                <Input
                  id="hours"
                  type="number"
                  min="0"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value)))}
                  placeholder="小時"
                />
                <Input
                  id="minutes"
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.min(59, Math.max(0, parseInt(e.target.value))))}
                  placeholder="分鐘"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="date">練習日期</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>選擇日期</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Button onClick={addLessonRecord} className="w-full">新增記錄</Button>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">篩選</h3>
            <div className="flex flex-wrap gap-2">
              <Select value={filterStudent} onValueChange={setFilterStudent}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="篩選學生" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">全部學生</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student.序號} value={student.姓名 || `student_${student.序號}`}>
                      {student.姓名}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="篩選教練" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">全部教練</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.序號} value={teacher.姓名 || `teacher_${teacher.序號}`}>
                      {teacher.姓名}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterDate ? format(filterDate, "PPP") : <span>篩選日期</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filterDate}
                    onSelect={setFilterDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" onClick={() => {
                setFilterStudent('_all')
                setFilterTeacher('_all')
                setFilterDate(undefined)
              }}>重置篩選</Button>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">課程記錄</h3>
              <Button variant="outline" onClick={exportToCSV} disabled={filteredRecords.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                匯出 CSV
              </Button>
            </div>
            {filteredRecords.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>學生</TableHead>
                    <TableHead>教練</TableHead>
                    <TableHead>練習時間</TableHead>
                    <TableHead>日期</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.studentName}</TableCell>
                      <TableCell>{record.teacherName}</TableCell>
                      <TableCell>{`${record.hours}小時${record.minutes}分鐘`}</TableCell>
                      <TableCell>{format(record.date, 'yyyy-MM-dd')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteLessonRecord(record.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground">沒有符合條件的記錄</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}