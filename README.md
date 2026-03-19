<div align="center">

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d1b2a,50:1b3a5c,100:0a2647&height=180&section=header&text=Imperador%20Backend&fontSize=40&fontColor=ffffff&fontAlignY=38&desc=Telemetry%20Server%20%7C%20Baja%20SAE%20Imperador&descAlignY=58&descSize=16&animation=fadeIn" width="100%"/>
  
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-660066?style=for-the-badge&logo=mqtt&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

</div>

---

## 📡 Sobre o Projeto

O **Imperador Backend** é o servidor de telemetria em tempo real do veículo Baja SAE da Equipe Imperador. Ele recebe dados críticos do veículo via **MQTT** (publicados pela MECU — Main Electronic Control Unit), persiste no banco de dados e distribui em tempo real para o dashboard via **WebSocket**.

Além da telemetria passiva, o servidor também processa **comandos de controle** enviados pelo dashboard, permitindo acionar remotamente a buzina, o diferencial e a chamada de box (que atualiza a tela DWIN embarcada no veículo).

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        VEÍCULO                              │
│                                                             │
│  ┌──────────┐   CAN/Serial   ┌──────────┐                  │
│  │  Sensores │ ────────────► │   MECU   │                  │
│  │ (RPM, T°, │               │  (C++)   │                  │
│  │  Vel...)  │               └────┬─────┘                  │
│  └──────────┘                     │ MQTT Publish           │
│                              ┌────▼─────┐                  │
│                              │   DWIN   │ ◄── Box Call      │
│                              │ Display  │                   │
│                              └──────────┘                  │
└───────────────────────────────────┼─────────────────────────┘
                                    │ MQTT (WiFi/4G)
                    ┌───────────────▼──────────────┐
                    │      IMPERADOR BACKEND        │
                    │                               │
                    │  MQTT Subscriber              │
                    │       │                       │
                    │       ▼                       │
                    │  Data Processing              │
                    │       │                       │
                    │  ┌────┴────┐  ┌────────────┐ │
                    │  │   DB    │  │ WebSocket  │ │
                    │  │ Storage │  │  Broadcast │ │
                    │  └─────────┘  └─────┬──────┘ │
                    └────────────────────┼──────────┘
                                         │ WebSocket
                    ┌────────────────────▼──────────┐
                    │      IMPERADOR FRONTEND        │
                    │   Dashboard de Telemetria      │
                    └────────────────────────────────┘
```

---

## ⚡ Funcionalidades

### Telemetria (recepção via MQTT)
- 🏎️ **Velocidade** do veículo em tempo real
- 🔄 **RPM** do motor
- 🌡️ **Temperatura da CVT** (dado crítico de segurança)
- 📊 Demais sensores embarcados

### Controle Remoto (comandos via WebSocket → MQTT)
- 📯 **Buzina** — aciona o buzzer do veículo remotamente
- ⚙️ **Diferencial** — habilita/desabilita o diferencial
- 🏁 **Chamada de Box** — envia comando que altera a tela do display DWIN embarcado para a tela de pit stop

### Persistência
- 💾 Armazenamento de histórico de telemetria no banco de dados

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Linguagem | TypeScript |
| Runtime | Node.js |
| Protocolo IoT | MQTT |
| Tempo Real | WebSocket |
| Banco de Dados | SQLite / PostgreSQL |
| Comunicação Veicular | MECU (C++ embarcado) |
| Display Embarcado | DWIN (protocolo serial) |

---

## 🚀 Como Rodar

### Pré-requisitos
- Node.js 18+
- Broker MQTT (ex: Mosquitto)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/Equipe-Imperador/imperador-backend.git
cd imperador-backend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com o endereço do broker MQTT e configurações do banco
```

### Executar

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

---

## 👥 Equipe

Desenvolvido pela **Equipe Imperador Baja SAE — UTFPR Curitiba**

Subsistema de Eletrônica Embarcada

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:e96c00,100:1a1a2e&height=100&section=footer" width="100%"/>

</div>
