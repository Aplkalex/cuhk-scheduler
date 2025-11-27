"use client";

import React, { useState, useEffect } from "react";
import { X, ExternalLink, Phone, MapPin, Heart, Battery, Dog, Home, AlertTriangle, Users, Car, Stethoscope, Package } from "lucide-react";

export default function TaiPoFirePopup() {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        // Open on mount with a slight delay for smooth entry
        const timer = setTimeout(() => setIsOpen(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
        }, 300); // Match animation duration
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100 animate-fadeIn'}`}
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div
                className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 scrollbar-thin transition-all duration-300 ${isClosing ? 'opacity-0 scale-95 translate-y-4' : 'animate-slideInFromTop'}`}
            >

                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold animate-pulse">
                                <AlertTriangle className="w-4 h-4" />
                                URGENT
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">Nov 27</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                            <span>請關注大埔宏福苑火警</span>
                            <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                            <span className="text-lg sm:text-xl font-normal text-gray-600 dark:text-gray-300">Please pay attention to the Tai Po Wang Fuk Court fire</span>
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            社區資源整合 Community Resources Integration
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-8">

                    {/* Must Read / Lazy Pack */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4">
                        <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2 text-lg">
                            <AlertTriangle className="w-5 h-5" /> ‼️必讀注意事項‼️ Must Read / Lazy Pack
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                            <a href="https://t.me/c/3321153175/11852" target="_blank" className="flex items-center gap-2 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors group">
                                <span className="text-2xl">🔻</span>
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-amber-700 dark:group-hover:text-amber-400">物資救援組流程</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Logistics Flow (Must Read)</div>
                                </div>
                            </a>
                            <a href="https://t.me/universalsentinelsinblack" target="_blank" className="flex items-center gap-2 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors group">
                                <span className="text-2xl">🔻</span>
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-amber-700 dark:group-hover:text-amber-400">主要消息發放頻道</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Main Info Channel (Updates)</div>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* Volunteer & Logistics Groups */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-500" /> 義工及物資 Volunteer & Logistics
                        </h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <GroupCard icon={<Users className="w-4 h-4" />} title="義工 Group" subtitle="Volunteer Group" link="https://t.me/taipomanpower" />
                            <GroupCard icon={<ExternalLink className="w-4 h-4" />} title="義工報名 Link" subtitle="Volunteer Registration" link="https://taipo1126.com/volunteer/tasks" />
                            <GroupCard icon={<Users className="w-4 h-4" />} title="1300 自發集結" subtitle="1300 Gathering" link="https://t.me/+yrBO_JX9PD1kMWM1" />
                            <GroupCard icon={<Car className="w-4 h-4" />} title="車手 Group" subtitle="Drivers Group" link="https://t.me/taipodrivers" />
                            <GroupCard icon={<Stethoscope className="w-4 h-4" />} title="醫護 Group" subtitle="Medical Group" link="https://t.me/taipomanpower/1273" />
                            <GroupCard icon={<Package className="w-4 h-4" />} title="物資地圖" subtitle="Supplies Map" link="https://experience.arcgis.com/experience/22b9d309e69548f28d2f4055d4de5ace?fbclid=PAZnRzaAOUezBleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAaduQEuls360CfJgC-SxSZ3miyMl1fCj7m3lJpIjEWrX8ditPlz9Sv9Ypg8RUw_aem_o1WFaB225Z0qIkKhbh74og" />
                        </div>
                    </section>

                    {/* News Link */}
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl p-4">
                        <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" /> 新聞 News
                        </h3>
                        <a
                            href="https://www.scmp.com/news/hong-kong/society/article/3334217/major-fire-hong-kongs-tai-po-leaves-2-severely-burned-residents-trapped?module=top_story&pgtype=section"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline block"
                        >
                            44 dead, 279 missing in huge Hong Kong fire; 3 arrested for alleged manslaughter – as it happened
                        </a>
                    </div>

                    {/* Emergency Contacts */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Phone className="w-5 h-5 text-blue-500" /> 緊急熱線 Emergency Hotlines
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="col-span-full sm:col-span-2 bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20 flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-xl text-red-600 dark:text-red-400">緊急求助 Emergency</div>
                                    <div className="text-sm text-red-400 dark:text-red-300">火警、急救 Fire, Ambulance</div>
                                </div>
                                <a href="tel:999" className="text-3xl font-black text-red-600 dark:text-red-400 hover:scale-105 transition-transform">
                                    999
                                </a>
                            </div>
                            <ContactCard title="警方熱線 Police Hotline" desc="查詢死傷者資料 Inquiry" phone="1878 999" />
                        </div>
                    </section>

                    {/* Aid Stations */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-green-500" /> 跨部門援助站 Cross-departmental Aid Stations
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <ContactCard title="大埔民政事務處 Tai Po DO" desc="雅麗氏何妙齡那打素醫院 Alice Ho Miu Ling Nethersole Hospital" phone="2658 4040" />
                            <ContactCard title="沙田民政事務處 Sha Tin DO" desc="威爾斯親王醫院 Prince of Wales Hospital" phone="3505 1555" />
                        </div>
                    </section>

                    {/* Shelters */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Home className="w-5 h-5 text-orange-500" /> 臨時庇護中心 Temporary Shelters
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <ContactCard title="大埔社區中心 Tai Po Community Centre" desc="大埔鄉事會街 Heung Sze Wui St" phone="2653 4220" />
                            <ContactCard title="善樓（善導會）Sin Lau" desc="大埔船灣陳屋168號 168 Chan Uk, Shuen Wan" />
                        </div>
                    </section>

                    {/* Elderly Support */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Heart className="w-5 h-5 text-pink-500" /> 長者休息站 Elderly Support
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <ContactCard title="東華三院照顧者支援專線 TWGHs Carer Support" desc="緊急宿位及暫托 Emergency Shelter & Respite" phone="182 183" />
                            <ContactCard title="救世軍大埔長者社區服務中心 Salvation Army" desc="大埔社區中心二樓 (通宵看顧) Overnight Care" phone="2653 6811" />
                            <ContactCard title="保良局李兆基青年綠洲 PLK Youth Oasis" desc="緊急住宿服務 Emergency Accommodation" phone="2128 1988" />
                            <ContactCard title="新界傷健中心 HKPHAB" desc="大埔廣福邨廣平樓 Kwong Ping House" phone="2638 9011" />
                            <ContactCard title="大埔樂善堂院舍 Lok Sin Tong" desc="長者暫住 Elderly Temporary Stay" />
                        </div>
                    </section>

                    {/* Other Rest Stations */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Home className="w-5 h-5 text-indigo-500" /> 其他休息站 Other Rest Stations
                        </h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <ContactCard title="大埔藝術中心 Tai Po Arts Centre" desc="提供洗澡、水機 Showers & Water" phone="3468 3417" />
                            <ContactCard title="東昌街體育館 Tung Cheong St Sports Centre" desc="大埔墟東昌街25號" />
                            <ContactCard title="大埔浸信會教育樓 Baptist Church" desc="大埔墟懷義街 Wai Yi St" phone="2656 1766" />
                            <ContactCard title="大元邨銘恩中心會堂 Ming Yan Centre" desc="大埔大元邨 Tai Yuen Estate" phone="2661 6246" />
                            <ContactCard title="YMCA烏溪沙青年新村 Wu Kai Sha Village" desc="900宿位免費入住 Free Accommodation" phone="2642 9420" />
                            <ContactCard title="嘉禾大埔戲院 Golden Harvest" desc="通宵開放 Overnight Open" phone="2510 8122" />
                            <ContactCard title="大埔超級城D區 Tai Po Mega Mall Zone D" desc="24小時開放/充電 24H Open/Charging" phone="2665 6828" />
                            <ContactCard title="大埔各 24/7 Fitness" desc="Open 24/7" />
                            <ContactCard title="仁愛堂賽馬會田家炳中心 Yan Oi Tong" desc="運頭塘 Wan Tau Tong" phone="2654 6188" />
                            <ContactCard title="賽馬會大埔綜合青少年服務中心 HKCYS" desc="廣福邨廣仁樓 Kwong Yan House" phone="2653 8514" />
                            <ContactCard title="禮賢會大埔金福堂 Rhenish Church" desc="大埔安富道 On Fu Rd" phone="2665 1786" />
                            <ContactCard title="救世軍大埔青少年綜合服務中心 Salvation Army" desc="大埔大元邨 Tai Yuen Estate" phone="2667 2913" />
                            <ContactCard title="宣道會大埔堂 Alliance Church" desc="大埔商業中心 Tai Po Comm. Centre" phone="9746 8710 (趙牧師)" />
                            <ContactCard title="基督教星愛堂 Star of Love Church" desc="大埔崇德街 Sung Tak St" phone="6922 6202 (鄧小姐)" />
                            <ContactCard title="聖公會救主堂社會服務中心 SKH Church" desc="廣福邨廣仁樓 Kwong Yan House" phone="2651 1998" />
                            <ContactCard title="基督復臨安息日大埔教會 Adventist Church" desc="廣福道70號 Kwong Fuk Rd" phone="2796 7180" />
                            <ContactCard title="大埔聖母無玷之心堂 Immaculate Heart of Mary" desc="大埔運頭街 Wan Tau St" phone="2652 2655" />
                            <ContactCard title="救主堂社會服務中心 Church of Our Saviour" desc="賽馬會家庭幹線 Family Link" phone="2651 1998" />
                        </div>
                    </section>

                    {/* Pet Support */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Dog className="w-5 h-5 text-amber-500" /> 寵物支援 Pet Support
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <ContactCard title="香港寵物會 HK Pet Club" desc="救護車 Standby Ambulance" phone="9782 2999" />
                            <ContactCard title="阿棍屋 House of Joy & Mercy" desc="" phone="9738 7272" />
                            <ContactCard title="唯珍牽 Regina Paws" desc="狗隻暫托 Dog Foster" phone="5408 9929" />
                            <ContactCard title="香港拯救貓狗協會 HKSCDA" desc="臨時安置 Temp Shelter" phone="9864 1089" />
                            <ContactCard title="QQ O2 寵物氧氣 Pet Oxygen" desc="出借氧氣 Oxygen Loan" phone="5541 6234" />
                            <ContactCard title="Don Don Pet Travel" desc="飛機籠/貓暫住 Cages/Cat Stay" phone="9440 6668" />
                            <ContactCard title="N24社區動物醫院 N24 Vet" desc="免診金及X光 Free Consult/X-ray" phone="2956 5999" />
                            <ContactCard title="香港社企動物醫院 HKSE Vet" desc="聞氧免費 Free Oxygen" phone="2668 6618" />
                            <ContactCard title="城大動物醫療中心 CityU VMC" desc="免診金 Free Consult" phone="3650 3200" />
                            <ContactCard title="豐盈急症室 Harvest Vet" desc="免費義診 Free Clinic" phone="3102 8528" />
                        </div>
                    </section>

                    {/* Charging & Financial */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Battery className="w-5 h-5 text-green-600" /> 其他支援 Other Support
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <ContactCard title="CHARGESPOT" desc="160小時免費充電 Free Charging" />
                            <ContactCard title="樂善堂 Lok Sin Tong" desc="每戶$3000緊急援助 Emergency Fund" />
                            <ContactCard title="聖公會心意行動 SKH Act of Love" desc="熱線 Hotline" phone="8209 8122" />
                            <ContactCard title="家庭福利會 HK Family Welfare" desc="危急家庭支援 Crisis Support" phone="2772 2322" />
                            <ContactCard title="保良局 Po Leung Kuk" desc="即時經濟援助 Financial Aid" phone="2277 8333" />
                            <ContactCard title="東華三院 TWGHs" desc="24小時支援/資金/殯儀 24H Support/Fund/Funeral" phone="18281" />
                        </div>
                    </section>

                    {/* Emotional Support */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Heart className="w-5 h-5 text-rose-500" /> 情緒支援 24H Emotional Support
                        </h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <ContactCard title="Open 噏" desc="WhatsApp / SMS" phone="9101 2012" />
                            <ContactCard title="社會福利署 SWD" desc="熱線 Hotline" phone="2343 2255" />
                            <ContactCard title="香港撒瑪利亞防止自殺會 SBHK" desc="熱線 Hotline" phone="2389 2222" />
                            <ContactCard title="撒瑪利亞會 Samaritans" desc="多種語言 Multilingual" phone="2896 0000" />
                            <ContactCard title="生命熱線 SPS" desc="熱線 Hotline" phone="2382 0000" />
                            <ContactCard title="明愛向晴熱線 Caritas" desc="熱線 Hotline" phone="18288" />
                        </div>
                    </section>

                    {/* Online Groups */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4">
                        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">民間支援 Online Groups</h3>
                        <div className="space-y-2">
                            <a href="http://t.me/taipofiresupport" target="_blank" className="block text-blue-600 dark:text-blue-400 hover:underline">
                                TG: 大埔宏福苑火災·支援頻道 Support Channel
                            </a>
                            <a href="https://taipo-fire.web.app/" target="_blank" className="block text-blue-600 dark:text-blue-400 hover:underline">
                                Web: 居民報平安連結 Safety Check
                            </a>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="sticky bottom-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex justify-end">
                    <button
                        onClick={handleClose}
                        className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        關閉 Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function ContactCard({ title, desc, phone }: { title: string, desc?: string, phone?: string }) {
    return (
        <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-gray-100 dark:border-zinc-700/50">
            <div className="font-medium text-gray-900 dark:text-gray-100">{title}</div>
            {desc && <div className="text-sm text-gray-500 dark:text-gray-400">{desc}</div>}
            {phone && (
                <a href={`tel:${phone.replace(/ /g, '')}`} className="text-blue-600 dark:text-blue-400 text-sm font-medium mt-1 block hover:underline">
                    📞 {phone}
                </a>
            )}
        </div>
    );
}

function GroupCard({ icon, title, subtitle, link }: { icon: React.ReactNode, title: string, subtitle: string, link: string }) {
    return (
        <a href={link} target="_blank" className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors group">
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                {icon}
            </div>
            <div>
                <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400">{title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
            </div>
        </a>
    );
}
