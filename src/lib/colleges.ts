/**
 * List of KTU Engineering and Architecture Colleges in Kerala with official and popular short codes.
 * Sourced from KTU_colleges_Kerala_2026_with_official_codes.csv
 */

export interface CollegeInfo {
  name: string;
  codes: string[];
  primaryCode?: string;
}

export interface CollegeSearchResult {
  name: string;
  code?: string;
}

export const KTU_COLLEGE_DATABASE: CollegeInfo[] = [
  {
    "name": "LBS College of Engineering, Kasaragod",
    "codes": [
      "KSD",
      "LBSCE",
      "LBS Kasaragod",
      "Povval"
    ],
    "primaryCode": "KSD"
  },
  {
    "name": "Government Engineering College, Wayanad",
    "codes": [
      "GECW",
      "GEC Wayanad",
      "WYD"
    ],
    "primaryCode": "GECW"
  },
  {
    "name": "Sree Chitra Thirunal College of Engineering, Thiruvananthapuram",
    "codes": [
      "SCTCE",
      "SCT",
      "SCT Trivandrum",
      "Pappanamcode"
    ],
    "primaryCode": "SCTCE"
  },
  {
    "name": "Rajiv Gandhi Institute of Technology, Kottayam",
    "codes": [
      "KTE",
      "RIT",
      "RIT Kottayam"
    ],
    "primaryCode": "KTE"
  },
  {
    "name": "CAT College of Architecture, Trivandrum",
    "codes": []
  },
  {
    "name": "Vedavyasa Institute of Technology, Malappuram",
    "codes": []
  },
  {
    "name": "TKM Institute of Technology, Kollam",
    "codes": [
      "TKMIT"
    ],
    "primaryCode": "TKMIT"
  },
  {
    "name": "TKM College of Engineering, Kollam",
    "codes": [
      "TKM",
      "TKMCE"
    ],
    "primaryCode": "TKM"
  },
  {
    "name": "St Thomas Institute for Science and Technology, Thiruvananthapuram",
    "codes": []
  },
  {
    "name": "St Joseph's College of Engineering and Technology, Palai",
    "codes": []
  },
  {
    "name": "SNM Institute of Management and Technology, Ernakulam",
    "codes": [
      "SNM"
    ],
    "primaryCode": "SNM"
  },
  {
    "name": "North Malabar Institute of Technology, Kasaragod",
    "codes": []
  },
  {
    "name": "Mookambika Technical Campus, Ernakulam",
    "codes": []
  },
  {
    "name": "MET's School of Engineering, Thrissur",
    "codes": []
  },
  {
    "name": "M Dasan Institute of Technology, Kozhikode",
    "codes": []
  },
  {
    "name": "KVM College of Engineering and IT, Alappuzha",
    "codes": []
  },
  {
    "name": "KMP College of Engineering, Ernakulam",
    "codes": []
  },
  {
    "name": "Jyothi Engineering College, Thrissur",
    "codes": [
      "JEC",
      "Cheruthuruthy"
    ],
    "primaryCode": "JEC"
  },
  {
    "name": "Jai Bharath College of Management and Engineering Technology, Perumbavoor",
    "codes": []
  },
  {
    "name": "ILM College of Engineering and Technology, Ernakulam",
    "codes": []
  },
  {
    "name": "Government Engineering College, Barton Hill, Thiruvananthapuram",
    "codes": [
      "GECB",
      "GECBH",
      "Barton Hill",
      "TRV"
    ],
    "primaryCode": "GECB"
  },
  {
    "name": "Government Engineering College, Thrissur",
    "codes": [
      "GECT",
      "GEC Thrissur",
      "TCR"
    ],
    "primaryCode": "GECT"
  },
  {
    "name": "Government Engineering College, Kozhikode",
    "codes": [
      "KKE",
      "GECK",
      "GEC Calicut",
      "GEC Kozhikode"
    ],
    "primaryCode": "KKE"
  },
  {
    "name": "Government Engineering College, Idukki",
    "codes": [
      "IDK",
      "GECI",
      "GEC Idukki"
    ],
    "primaryCode": "IDK"
  },
  {
    "name": "Eranad Knowledge City Technical Campus, Malappuram",
    "codes": [
      "EKC"
    ],
    "primaryCode": "EKC"
  },
  {
    "name": "Cochin Institute of Science and Technology, Ernakulam",
    "codes": []
  },
  {
    "name": "Bishop Jerome School of Architecture and Design, Kollam",
    "codes": []
  },
  {
    "name": "Aryanet Institute of Technology, Palakkad",
    "codes": []
  },
  {
    "name": "Ahalia School of Engineering and Technology, Palakkad",
    "codes": [
      "ATP"
    ],
    "primaryCode": "ATP"
  },
  {
    "name": "Holy Grace Academy of Engineering, Mala",
    "codes": []
  },
  {
    "name": "Sree Narayana Guru Institute of Science and Technology, Ernakulam",
    "codes": []
  },
  {
    "name": "MG College of Engineering, Thiruvananthapuram",
    "codes": []
  },
  {
    "name": "Younus Institute of Technology, Kollam",
    "codes": []
  },
  {
    "name": "Younus College of Engineering, Kollam",
    "codes": []
  },
  {
    "name": "Younus College of Engineering and Technology, Kollam",
    "codes": []
  },
  {
    "name": "Viswajyothi College of Engineering and Technology, Ernakulam",
    "codes": [
      "VJCET",
      "VJC",
      "Viswajyothi Vazhakulam"
    ],
    "primaryCode": "VJCET"
  },
  {
    "name": "Vimal Jyothi Engineering College, Kannur",
    "codes": [
      "VML"
    ],
    "primaryCode": "VML"
  },
  {
    "name": "Vijnan Institute of Science and Technology, Ernakulam",
    "codes": []
  },
  {
    "name": "Vidya Academy of Science and Technology, Thrissur",
    "codes": [
      "VAST",
      "VAS",
      "Vidya"
    ],
    "primaryCode": "VAST"
  },
  {
    "name": "Valia Koonambaikulathamma College of Engineering and Technology, Trivandrum",
    "codes": []
  },
  {
    "name": "Universal Engineering College, Thrissur",
    "codes": [
      "UNT"
    ],
    "primaryCode": "UNT"
  },
  {
    "name": "UKF College of Engineering and Technology, Kollam",
    "codes": [
      "UKP",
      "UKFCET",
      "Parippally"
    ],
    "primaryCode": "UKP"
  },
  {
    "name": "Trinity College of Engineering, Thiruvananthapuram",
    "codes": [
      "TCT"
    ],
    "primaryCode": "TCT"
  },
  {
    "name": "Travancore Engineering College, Kollam",
    "codes": [
      "TEC"
    ],
    "primaryCode": "TEC"
  },
  {
    "name": "Toc H Institute of Science and Technology, Ernakulam",
    "codes": [
      "TOC",
      "TIST",
      "TOCH",
      "Arakkunnam"
    ],
    "primaryCode": "TOC"
  },
  {
    "name": "Thejus Engineering College, Thrissur",
    "codes": [
      "TJE"
    ],
    "primaryCode": "TJE"
  },
  {
    "name": "St Thomas College of Engineering and Technology, Alappuzha",
    "codes": []
  },
  {
    "name": "Mahaguru Institute of Technology, Mavelikara",
    "codes": []
  },
  {
    "name": "Sreepathy Institute of Management and Technology, Palakkad",
    "codes": [
      "SPT"
    ],
    "primaryCode": "SPT"
  },
  {
    "name": "Sree Narayana Gurukulam College of Engineering, Ernakulam",
    "codes": [
      "SNG",
      "SNGCE"
    ],
    "primaryCode": "SNG"
  },
  {
    "name": "Sree Narayana Guru College of Engineering and Technology, Kannur",
    "codes": [
      "SNC",
      "SNGCET"
    ],
    "primaryCode": "SNC"
  },
  {
    "name": "ICCS College of Engineering and Management, Thrissur",
    "codes": [
      "ECE"
    ],
    "primaryCode": "ECE"
  },
  {
    "name": "Sree Buddha College of Engineering, Alappuzha",
    "codes": [
      "SBC",
      "SBCE",
      "Pattoor"
    ],
    "primaryCode": "SBC"
  },
  {
    "name": "Sree Buddha College of Engineering, Pathanamthitta",
    "codes": []
  },
  {
    "name": "Shahul Hameed Memorial Engineering College, Kollam",
    "codes": []
  },
  {
    "name": "SCMS School of Engineering and Technology, Ernakulam",
    "codes": [
      "SCM",
      "SCMS",
      "Karukutty"
    ],
    "primaryCode": "SCM"
  },
  {
    "name": "Sarabhai Institute of Science and Technology, Thiruvananthapuram",
    "codes": [
      "SIT"
    ],
    "primaryCode": "SIT"
  },
  {
    "name": "Saintgits College of Engineering, Kottayam",
    "codes": [
      "MGP",
      "SAINTGITS"
    ],
    "primaryCode": "MGP"
  },
  {
    "name": "Sahrdaya College of Engineering and Technology, Thrissur",
    "codes": [
      "SHR",
      "Sahrdaya",
      "Kodakara"
    ],
    "primaryCode": "SHR"
  },
  {
    "name": "Sadguru Swami Nithyananda Institute of Technology, Kasaragod",
    "codes": []
  },
  {
    "name": "Royal College of Engineering and Technology, Thrissur",
    "codes": [
      "RCE"
    ],
    "primaryCode": "RCE"
  },
  {
    "name": "Rajagiri School of Engineering and Technology, Kochi",
    "codes": [
      "RSET",
      "Rajagiri"
    ],
    "primaryCode": "RSET"
  },
  {
    "name": "Rajadhani Institute of Engineering and Technology, Thiruvananthapuram",
    "codes": [
      "RIE"
    ],
    "primaryCode": "RIE"
  },
  {
    "name": "PRS College of Engineering and Technology, Thiruvananthapuram",
    "codes": []
  },
  {
    "name": "Prime College of Engineering, Palakkad",
    "codes": []
  },
  {
    "name": "Pankajakasthuri College of Engineering and Technology, Thiruvananthapuram",
    "codes": []
  },
  {
    "name": "PA Aziz College of Engineering and Technology, Thiruvananthapuram",
    "codes": []
  },
  {
    "name": "NSS College of Engineering, Palakkad",
    "codes": [
      "NSSCE",
      "NSS",
      "NSS Palakkad"
    ],
    "primaryCode": "NSSCE"
  },
  {
    "name": "Nirmala College of Engineering, Thrissur",
    "codes": []
  },
  {
    "name": "Muslim Association College of Engineering, Thiruvananthapuram",
    "codes": [
      "MUS"
    ],
    "primaryCode": "MUS"
  },
  {
    "name": "Musaliar College of Engineering and Technology, Pathanamthitta",
    "codes": [
      "MCK"
    ],
    "primaryCode": "MCK"
  },
  {
    "name": "Mount Zion Institute of Science and Technology, Alappuzha",
    "codes": []
  },
  {
    "name": "Mount Zion College of Engineering, Pathanamthitta",
    "codes": [
      "MZC"
    ],
    "primaryCode": "MZC"
  },
  {
    "name": "Mohandas College of Engineering and Technology, Thiruvananthapuram",
    "codes": [
      "MCET",
      "MCT",
      "Nedumangad",
      "Mohandas"
    ],
    "primaryCode": "MCET"
  },
  {
    "name": "Government Model Engineering College, Thrikkakara",
    "codes": [
      "MEC",
      "Model",
      "Model Engineering College",
      "MEC Kochi",
      "MDL"
    ],
    "primaryCode": "MEC"
  },
  {
    "name": "MES Institute of Technology and Management, Kollam",
    "codes": [
      "MEK"
    ],
    "primaryCode": "MEK"
  },
  {
    "name": "MES College of Engineering, Malappuram",
    "codes": []
  },
  {
    "name": "MES College of Engineering and Technology, Kunnukara",
    "codes": []
  },
  {
    "name": "MEA Engineering College, Malappuram",
    "codes": []
  },
  {
    "name": "Marian Engineering College, Thiruvananthapuram",
    "codes": [
      "MCE"
    ],
    "primaryCode": "MCE"
  },
  {
    "name": "Mar Baselios Institute of Technology and Science, Ernakulam",
    "codes": [
      "MBI"
    ],
    "primaryCode": "MBI"
  },
  {
    "name": "Mar Baselios College of Engineering and Technology, Thiruvananthapuram",
    "codes": [
      "MBCET",
      "MBT",
      "Baselios",
      "Mar Baselios Nalanchira"
    ],
    "primaryCode": "MBCET"
  },
  {
    "name": "Mar Baselios Christian College of Engineering and Technology, Idukki",
    "codes": []
  },
  {
    "name": "Mar Athanasius College of Engineering, Kothamangalam",
    "codes": [
      "MACE",
      "MAC",
      "MACE Kothamangalam"
    ],
    "primaryCode": "MACE"
  },
  {
    "name": "Mangalam College of Engineering, Kottayam",
    "codes": [
      "MLM"
    ],
    "primaryCode": "MLM"
  },
  {
    "name": "Malabar Institute of Technology, Kannur",
    "codes": [
      "MLT"
    ],
    "primaryCode": "MLT"
  },
  {
    "name": "Malabar College of Engineering and Technology, Thrissur",
    "codes": [
      "MEC"
    ],
    "primaryCode": "MEC"
  },
  {
    "name": "Lourdes Matha College of Science and Technology, Thiruvananthapuram",
    "codes": [
      "LMCST",
      "LMC",
      "Kuttichal"
    ],
    "primaryCode": "LMCST"
  },
  {
    "name": "LBS Institute of Technology for Women, Thiruvananthapuram",
    "codes": [
      "LBSITW",
      "LBT",
      "LBS Poojappura",
      "LBS Women"
    ],
    "primaryCode": "LBSITW"
  },
  {
    "name": "Kottayam Institute of Technology and Science, Kottayam",
    "codes": [
      "KIT"
    ],
    "primaryCode": "KIT"
  },
  {
    "name": "KMEA Engineering College, Ernakulam",
    "codes": []
  },
  {
    "name": "KMCT College of Engineering for Women, Kozhikode",
    "codes": [
      "KMW"
    ],
    "primaryCode": "KMW"
  },
  {
    "name": "KMCT College of Engineering, Kozhikode",
    "codes": [
      "KMC"
    ],
    "primaryCode": "KMC"
  },
  {
    "name": "KR Gouri Amma College of Engineering, Alappuzha",
    "codes": []
  },
  {
    "name": "John Cox Memorial CSI Institute of Technology, Thiruvananthapuram",
    "codes": [
      "JIT"
    ],
    "primaryCode": "JIT"
  },
  {
    "name": "Jawaharlal College of Engineering and Technology, Palakkad",
    "codes": []
  },
  {
    "name": "Indira Gandhi Institute of Engineering and Technology, Ernakulam",
    "codes": [
      "IGW"
    ],
    "primaryCode": "IGW"
  },
  {
    "name": "Ilahia School of Science and Technology, Ernakulam",
    "codes": []
  },
  {
    "name": "Ilahia College of Engineering and Technology, Muvattupuzha",
    "codes": []
  },
  {
    "name": "IES College of Engineering, Thrissur",
    "codes": [
      "IES"
    ],
    "primaryCode": "IES"
  },
  {
    "name": "Holy Kings College of Engineering and Technology, Ernakulam",
    "codes": []
  },
  {
    "name": "Hindustan College of Engineering, Kollam",
    "codes": []
  },
  {
    "name": "Heera College of Engineering and Technology, Thiruvananthapuram",
    "codes": [
      "HCE"
    ],
    "primaryCode": "HCE"
  },
  {
    "name": "Gurudeva Institute of Science and Technology, Kottayam",
    "codes": []
  },
  {
    "name": "Government Engineering College, Sreekrishnapuram",
    "codes": [
      "GECSKP",
      "GEC Palakkad"
    ],
    "primaryCode": "GECSKP"
  },
  {
    "name": "Government College of Engineering, Kannur",
    "codes": [
      "KNR",
      "GCEK",
      "GEC Kannur"
    ],
    "primaryCode": "KNR"
  },
  {
    "name": "Federal Institute of Science and Technology, Ernakulam",
    "codes": [
      "FISAT",
      "FIT",
      "FISAT Angamaly"
    ],
    "primaryCode": "FISAT"
  },
  {
    "name": "ER and DCI Institute of Technology, Thiruvananthapuram",
    "codes": []
  },
  {
    "name": "College of Engineering, Vadakara",
    "codes": [
      "VDA",
      "CEV",
      "CE Vadakara"
    ],
    "primaryCode": "VDA"
  },
  {
    "name": "College of Engineering, Thalassery",
    "codes": [
      "CETLY",
      "CE Thalassery"
    ],
    "primaryCode": "CETLY"
  },
  {
    "name": "College of Engineering, Pathanapuram",
    "codes": []
  },
  {
    "name": "College of Engineering, Cherthala",
    "codes": [
      "CEC",
      "CECTL",
      "CE Cherthala"
    ],
    "primaryCode": "CEC"
  },
  {
    "name": "College of Engineering, Attingal",
    "codes": [
      "CEA",
      "CEAL",
      "CE Attingal"
    ],
    "primaryCode": "CEA"
  },
  {
    "name": "College of Engineering, Trivandrum",
    "codes": [
      "CET",
      "TVE",
      "CET Trivandrum"
    ],
    "primaryCode": "CET"
  },
  {
    "name": "College of Engineering, Perumon",
    "codes": [
      "CEPRN",
      "CE Perumon"
    ],
    "primaryCode": "CEPRN"
  },
  {
    "name": "College of Engineering, Munnar",
    "codes": [
      "MNR",
      "CEM",
      "CE Munnar"
    ],
    "primaryCode": "MNR"
  },
  {
    "name": "College of Engineering, Kidangoor",
    "codes": [
      "CEKID",
      "CE Kidangoor"
    ],
    "primaryCode": "CEKID"
  },
  {
    "name": "College of Engineering, Karunagappally",
    "codes": [
      "CEK",
      "CE Karunagappally"
    ],
    "primaryCode": "CEK"
  },
  {
    "name": "College of Engineering, Chengannur",
    "codes": [
      "CEC",
      "CE Chengannur"
    ],
    "primaryCode": "CEC"
  },
  {
    "name": "College of Engineering and Management, Punnapra",
    "codes": []
  },
  {
    "name": "College of Engineering, Adoor",
    "codes": [
      "ADR",
      "CEA",
      "CE Adoor"
    ],
    "primaryCode": "ADR"
  },
  {
    "name": "College of Engineering and Technology, Payyanur",
    "codes": [
      "CEN"
    ],
    "primaryCode": "CEN"
  },
  {
    "name": "College of Engineering, Kallooppara",
    "codes": []
  },
  {
    "name": "College of Engineering, Kottarakkara",
    "codes": [
      "CEKTR",
      "CE Kottarakkara"
    ],
    "primaryCode": "CEKTR"
  },
  {
    "name": "MGM Technological Campus, Malappuram",
    "codes": [
      "CCV"
    ],
    "primaryCode": "CCV"
  },
  {
    "name": "Christ Knowledge City, Ernakulam",
    "codes": [
      "CKC"
    ],
    "primaryCode": "CKC"
  },
  {
    "name": "Believers Church Caarmel Engineering College, Ranni",
    "codes": []
  },
  {
    "name": "Bishop Jerome Institute, Kollam",
    "codes": [
      "BJK"
    ],
    "primaryCode": "BJK"
  },
  {
    "name": "Baselios Thomas I Catholicose College of Engineering and Technology, Ernakulam",
    "codes": []
  },
  {
    "name": "Baselios Mathews II College of Engineering, Kollam",
    "codes": [
      "BMC"
    ],
    "primaryCode": "BMC"
  },
  {
    "name": "Axis College of Engineering and Technology, Thrissur",
    "codes": []
  },
  {
    "name": "AWH Engineering College, Kozhikode",
    "codes": [
      "AWH"
    ],
    "primaryCode": "AWH"
  },
  {
    "name": "Archana College of Engineering, Alappuzha",
    "codes": []
  },
  {
    "name": "Rajadhani Institute of Science and Technology, Palakkad",
    "codes": [
      "AME"
    ],
    "primaryCode": "AME"
  },
  {
    "name": "Amal Jyothi College of Engineering, Kottayam",
    "codes": [
      "AJC",
      "AJCE",
      "Amal Jyothi"
    ],
    "primaryCode": "AJC"
  },
  {
    "name": "Albertian Institute of Science and Technology- Technical Campus, School of Engineering, Ernakulam",
    "codes": []
  },
  {
    "name": "Al-Ameen Engineering College, Palakkad",
    "codes": [
      "AAP"
    ],
    "primaryCode": "AAP"
  },
  {
    "name": "Al Azhar College of Engineering and Technology, Idukki",
    "codes": []
  },
  {
    "name": "Adi Shankara Institute of Engineering and Technology, Kalady",
    "codes": [
      "ASIET",
      "Adishankara"
    ],
    "primaryCode": "ASIET"
  },
  {
    "name": "University College of Engineering, Thodupuzha",
    "codes": []
  },
  {
    "name": "Musaliar College of Engineering, Thiruvananthapuram",
    "codes": []
  },
  {
    "name": "Pinnacle School of Engineering and Technology, Anchal",
    "codes": []
  },
  {
    "name": "Muthoot Institute of Technology and Science, Ernakulam",
    "codes": [
      "MITS",
      "Varikoli"
    ],
    "primaryCode": "MITS"
  },
  {
    "name": "FISAT Business School, Kochi",
    "codes": []
  },
  {
    "name": "College of Engineering, Aranmula",
    "codes": []
  },
  {
    "name": "St Gregorios College of Engineering, Perla",
    "codes": []
  },
  {
    "name": "St Thomas College of Engineering and Technology, Mattannur",
    "codes": []
  },
  {
    "name": "TOMS College of Engineering and Polytechnic, Mattakkara",
    "codes": []
  },
  {
    "name": "Focus Institute of Science and Technology, Poomala",
    "codes": []
  },
  {
    "name": "Carmel College of Engineering and Technology, Alappuzha",
    "codes": []
  },
  {
    "name": "Vidya Academy of Science and Technology - Technical Campus, Thiruvananthapuram",
    "codes": []
  },
  {
    "name": "Musaliar Institute of Management, Pathanamthitta",
    "codes": []
  },
  {
    "name": "Saintgits Institute of Management, Pathamuttom",
    "codes": []
  },
  {
    "name": "Christ College of Engineering, Thrissur",
    "codes": [
      "CCE"
    ],
    "primaryCode": "CCE"
  },
  {
    "name": "Providence College of Engineering, Alappuzha",
    "codes": []
  },
  {
    "name": "College of Engineering, Muttathara",
    "codes": []
  },
  {
    "name": "Saintgits Institute of Computer Applications, Kottayam",
    "codes": []
  },
  {
    "name": "MGM College of Engineering and Technology, Ernakulam",
    "codes": []
  },
  {
    "name": "Mount Zion Institute of Management, Kozhuvalloor",
    "codes": []
  },
  {
    "name": "Nirmala College of Management Studies, Chalakkudy",
    "codes": []
  },
  {
    "name": "DC School of Management and Technology, Thiruvananthapuram",
    "codes": []
  },
  {
    "name": "Carmel College, Muhamma",
    "codes": []
  },
  {
    "name": "Rajadhani Institute of Hotel Management and Catering Technology, Thiruvananthapuram",
    "codes": []
  },
  {
    "name": "Indira Gandhi Institute of Polytechnic and Engineering, Ernakulam",
    "codes": []
  },
  {
    "name": "Kerala State Institute of Design, Kollam",
    "codes": []
  },
  {
    "name": "KMCT Institute of Emerging Technology and Management, Kozhikode",
    "codes": []
  },
  {
    "name": "KMCT College of Hotel Management and Catering Technology, Malappuram",
    "codes": []
  },
  {
    "name": "South Park Institute of Hotel Management, Thiruvananthapuram",
    "codes": []
  },
  {
    "name": "DC School of Architecture and Design, Thiruvananthapuram",
    "codes": []
  },
  {
    "name": "KMCT Institute of Technology and Management, Malappuram",
    "codes": []
  },
  {
    "name": "Saintgits Design School, Kottayam",
    "codes": []
  },
  {
    "name": "Kuniya College of Management and IT, Kasaragod",
    "codes": []
  },
  {
    "name": "KMCT College of Technology and Management, Vadakara",
    "codes": []
  },
  {
    "name": "KMCT Institute of Engineering and Management, Malappuram",
    "codes": []
  },
  {
    "name": "KMCT College of Engineering and Management, Kasargod",
    "codes": []
  },
  {
    "name": "KMCT College of Engineering For Emerging Technologies and Management, Perinthalmanna",
    "codes": []
  },
  {
    "name": "Nehru College of Engineering and Research Centre, Thrissur",
    "codes": [
      "NCE"
    ],
    "primaryCode": "NCE"
  },
  {
    "name": "College of Engineering, Trikaripur",
    "codes": [
      "TKR",
      "CETKR",
      "CE Trikaripur"
    ],
    "primaryCode": "TKR"
  },
  {
    "name": "College of Engineering, Poonjar",
    "codes": []
  },
  {
    "name": "Rajadhani Business School, Thiruvananthapuram",
    "codes": []
  }
];

export const KTU_COLLEGES: string[] = KTU_COLLEGE_DATABASE.map(c => c.name);

// Regional phonetic & location synonyms across Kerala
const REGIONAL_SYNONYMS: Record<string, string> = {
  "trivandrum": "thiruvananthapuram",
  "thiruvananthapuram": "trivandrum",
  "calicut": "kozhikode",
  "kozhikode": "calicut",
  "cochin": "ernakulam",
  "kochi": "ernakulam",
  "ernakulam": "kochi",
  "trichur": "thrissur",
  "thrissur": "trichur",
  "alleppey": "alappuzha",
  "alappuzha": "alleppey",
  "quilon": "kollam",
  "kollam": "quilon",
  "palghat": "palakkad",
  "palakkad": "palghat",
  "cannanore": "kannur",
  "kannur": "cannanore"
};

/**
 * Calculates Levenshtein distance between two strings for typo tolerance
 */
function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  const d: number[][] = [];
  for (let i = 0; i <= s1.length; i++) d[i] = [i];
  for (let j = 0; j <= s2.length; j++) d[0][j] = j;

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[s1.length][s2.length];
}

/**
 * Enhanced search supporting:
 * 1. Official KTU codes (e.g. SCT, TVE, FIT, MAC, KSD, KKE, etc.)
 * 2. Popular short codes & acronyms (e.g. SCTCE, CET, FISAT, MACE, RIT, TKM, GECB, MEC, VAST)
 * 3. Misspellings and typos (e.g. "sree chithra", "bartan", "santgits", "vidhya", "kozhikod")
 * 4. Regional synonyms (e.g. Trivandrum/Thiruvananthapuram, Calicut/Kozhikode, Cochin/Ernakulam)
 */
export function searchColleges(query: string, maxResults = 8): CollegeSearchResult[] {
  if (!query || !query.trim()) return [];
  const cleanQ = query.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
  const tokens = cleanQ.split(/\s+/).filter(Boolean);

  const scored: { item: CollegeSearchResult; score: number }[] = [];

  for (const col of KTU_COLLEGE_DATABASE) {
    let score = 0;
    const lowerName = col.name.toLowerCase();
    const cleanColName = lowerName.replace(/[^a-z0-9\s]/g, '');
    const colWords = cleanColName.split(/\s+/).filter(Boolean);
    const lowerCodes = col.codes.map(c => c.toLowerCase());

    // 1. Direct code exact match (Highest Priority)
    for (const code of lowerCodes) {
      if (code === cleanQ) {
        score += 10000;
        break;
      } else if (code.startsWith(cleanQ)) {
        score += 5000;
      }
    }

    // 2. Exact full substring match in name
    if (lowerName.includes(cleanQ)) {
      score += 2000;
      if (lowerName.startsWith(cleanQ)) {
        score += 1500;
      }
    }

    // 3. Token-level matching
    let allTokensMatched = true;
    for (const token of tokens) {
      let tokenMatched = false;

      // Check codes
      for (const code of lowerCodes) {
        if (code === token || code.includes(token)) {
          tokenMatched = true;
          score += 1500;
          break;
        }
      }

      // Check exact words in college name
      for (const word of colWords) {
        if (word === token) {
          tokenMatched = true;
          score += 800;
          break;
        } else if (word.startsWith(token)) {
          tokenMatched = true;
          score += 400;
          break;
        } else if (word.includes(token) && token.length >= 3) {
          tokenMatched = true;
          score += 200;
          break;
        }
      }

      // Regional synonym check (e.g. calicut -> kozhikode, trivandrum -> thiruvananthapuram)
      const syn = REGIONAL_SYNONYMS[token];
      if (syn && !tokenMatched) {
        for (const word of colWords) {
          if (word.includes(syn)) {
            tokenMatched = true;
            score += 700;
            break;
          }
        }
      }

      // Fuzzy typo check against words if token length >= 4
      if (!tokenMatched && token.length >= 4) {
        let bestDistance = 999;
        for (const word of colWords) {
          if (Math.abs(word.length - token.length) <= 2) {
            const dist = levenshteinDistance(token, word);
            if (dist < bestDistance) bestDistance = dist;
          }
        }

        const maxDist = token.length >= 7 ? 2 : 1;
        if (bestDistance <= maxDist) {
          tokenMatched = true;
          score += 350 - (bestDistance * 100);
        }
      }

      if (!tokenMatched) {
        allTokensMatched = false;
      }
    }

    if (score > 0) {
      if (allTokensMatched) score += 500;
      scored.push({
        item: {
          name: col.name,
          code: col.primaryCode
        },
        score
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map(s => s.item);
}
