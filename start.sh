#!/bin/bash

echo "🚀 CRM DEMO - PostgreSQL + Adminer + MailCatcher Version"

# Provjera je li Docker pokrenut
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker nije pokrenut. Pokreni Docker prvo."
    exit 1
fi

# Funkcija za provjeru porta
check_port() {
    nc -z localhost "$1" 2>/dev/null
}

# Funkcija za pokretanje MailCatcher-a
start_mailcatcher() {
    echo "📧 Pokrećem MailCatcher..."
    
    # Zaustavi postojeći MailCatcher ako radi
    docker stop crm-mailcatcher 2>/dev/null || true
    docker rm crm-mailcatcher 2>/dev/null || true
    
    # Pronađi slobodan port za MailCatcher SMTP
    MAILCATCHER_SMTP_PORT=1025
    while check_port $MAILCATCHER_SMTP_PORT; do
        echo "⚠️  SMTP port $MAILCATCHER_SMTP_PORT zauzet, pokušavam sljedeći..."
        MAILCATCHER_SMTP_PORT=$((MAILCATCHER_SMTP_PORT + 1))
        if [ $MAILCATCHER_SMTP_PORT -gt 1035 ]; then
            echo "❌ Nije moguće pronaći slobodan SMTP port"
            return 1
        fi
    done
    
    # Pronađi slobodan port za MailCatcher web interface
    MAILCATCHER_WEB_PORT=1080
    while check_port $MAILCATCHER_WEB_PORT; do
        echo "⚠️  Web port $MAILCATCHER_WEB_PORT zauzet, pokušavam sljedeći..."
        MAILCATCHER_WEB_PORT=$((MAILCATCHER_WEB_PORT + 1))
        if [ $MAILCATCHER_WEB_PORT -gt 1090 ]; then
            echo "❌ Nije moguće pronaći slobodan web port"
            return 1
        fi
    done
    
    echo "🔧 Koristim portove: SMTP=$MAILCATCHER_SMTP_PORT, Web=$MAILCATCHER_WEB_PORT"
    
    # Pokreni MailCatcher container s boljim postavkama
    docker run -d \
        --name crm-mailcatcher \
        -p $MAILCATCHER_SMTP_PORT:1025 \
        -p $MAILCATCHER_WEB_PORT:1080 \
        --restart unless-stopped \
        schickling/mailcatcher
    
    echo "⏳ Čekam MailCatcher da se pokrene..."
    
    # Sačekaj da se MailCatcher pokrene
    local wait_time=0
    local max_wait=30
    while [ $wait_time -lt $max_wait ]; do
        if docker ps | grep -q crm-mailcatcher; then
            # Provjeri je li container zdrav
            if docker logs crm-mailcatcher 2>/dev/null | grep -q "Starting MailCatcher"; then
                break
            fi
        fi
        sleep 2
        wait_time=$((wait_time + 2))
        echo "⏳ Čekam MailCatcher... ($wait_time/$max_wait sekundi)"
    done
    
    if docker ps | grep -q crm-mailcatcher; then
        # Dodatna provjera da li su portovi aktivni
        sleep 3
        
        if check_port $MAILCATCHER_SMTP_PORT && check_port $MAILCATCHER_WEB_PORT; then
            echo "✅ MailCatcher uspješno pokrenut:"
            echo "   📧 SMTP server: localhost:$MAILCATCHER_SMTP_PORT"
            echo "   🌐 Web interface: http://localhost:$MAILCATCHER_WEB_PORT"
            export MAILCATCHER_SMTP_PORT=$MAILCATCHER_SMTP_PORT
            export MAILCATCHER_WEB_URL="http://localhost:$MAILCATCHER_WEB_PORT"
            
            # Prikaži logove za verifikaciju
            echo "🔍 MailCatcher status:"
            docker logs crm-mailcatcher --tail 5 2>/dev/null || echo "⚠️  Nema dostupnih logova"
            
            return 0
        else
            echo "⚠️  MailCatcher container je pokrenut ali portovi nisu dostupni"
            echo "📋 Logovi MailCatcher-a:"
            docker logs crm-mailcatcher 2>/dev/null || echo "Nema dostupnih logova"
            return 1
        fi
    else
        echo "❌ MailCatcher nije uspješno pokrenut nakon $max_wait sekundi"
        echo "📋 Zadnji logovi:"
        docker logs crm-mailcatcher 2>/dev/null || echo "⚠️  Nema dostupnih logova"
        return 1
    fi
}

# Funkcija za pokretanje Adminera
start_adminer() {
    echo "🛠️  Pokrećem Adminer..."
    
    # Zaustavi postojeći Adminer ako radi
    docker stop crm-adminer 2>/dev/null || true
    docker rm crm-adminer 2>/dev/null || true
    
    # Pronađi slobodan port za Adminer
    ADMINER_PORT=8080
    while check_port $ADMINER_PORT; do
        echo "⚠️  Port $ADMINER_PORT zauzet, pokušavam sljedeći..."
        ADMINER_PORT=$((ADMINER_PORT + 1))
        if [ $ADMINER_PORT -gt 8100 ]; then
            echo "❌ Nije moguće pronaći slobodan port za Adminer"
            return 1
        fi
    done
    
    # Pokreni Adminer container
    docker run -d \
        --name crm-adminer \
        -p $ADMINER_PORT:8080 \
        -e ADMINER_DEFAULT_SERVER=host.docker.internal \
        -e ADMINER_DEFAULT_USERNAME=crm_user \
        -e ADMINER_DEFAULT_DB=crm_demo \
        -e ADMINER_DEFAULT_DRIVER=pgsql \
        --add-host=host.docker.internal:host-gateway \
        adminer
    
    echo "⏳ Čekam Adminer na portu $ADMINER_PORT..."
    sleep 5
    
    if docker ps | grep -q crm-adminer && check_port $ADMINER_PORT; then
        echo "✅ Adminer pokrenut na http://localhost:$ADMINER_PORT"
        export ADMINER_URL="http://localhost:$ADMINER_PORT"
        return 0
    else
        echo "❌ Adminer nije uspješno pokrenut"
        docker logs crm-adminer 2>/dev/null || echo "⚠️  Nema dostupnih logova"
        return 1
    fi
}

# Funkcija za pokretanje PostgreSQL
start_postgres() {
    echo "🗄️  Pokrećem PostgreSQL na portu 5433..."
    
    # Zaustavi postojeći PostgreSQL ako radi
    docker-compose down 2>/dev/null || true
    
    # Pokreni novi
    docker-compose up -d postgres
    
    POSTGRES_READY_TIMEOUT=30
    echo "⏳ Čekam PostgreSQL na portu 5433 (timeout: $((POSTGRES_READY_TIMEOUT*2)) sekundi)..."
    for ((i=1; i<=POSTGRES_READY_TIMEOUT; i++)); do
        if docker-compose exec -T postgres pg_isready -U crm_user -d crm_demo > /dev/null 2>&1; then
            echo "✅ PostgreSQL spreman na portu 5433!"
            return 0
        fi
        echo "⏳ Još čekam PostgreSQL... ($i/$POSTGRES_READY_TIMEOUT)"
        sleep 2
    done
    echo "❌ PostgreSQL nije responsive nakon $((POSTGRES_READY_TIMEOUT*2)) sekundi"
    docker-compose logs postgres
    return 1
}

# Funkcija za inicijalizaciju baze
init_database() {
    echo "🔄 Inicijaliziram bazu..."
    cd backend
    
    # Postavi environment varijable
    export DATABASE_URL="postgresql://crm_user:crm_password@localhost:5433/crm_demo"
    
    # Postavi email konfiguraciju
    if [ -n "$MAILCATCHER_SMTP_PORT" ]; then
        export EMAIL_HOST="localhost"
        export EMAIL_PORT="$MAILCATCHER_SMTP_PORT"
        export EMAIL_SECURE="false"
        echo "🔧 Email config: SMTP na localhost:$MAILCATCHER_SMTP_PORT"
    else
        echo "⚠️  MailCatcher nije pokrenut, email funkcionalnost onemogućena"
        export EMAIL_HOST="localhost"
        export EMAIL_PORT="1025"
        export EMAIL_SECURE="false"
    fi
    
    echo "🔧 DATABASE_URL: postgresql://crm_user:****@localhost:5433/crm_demo"
    
    # Sačekaj malo da se baza potpuno pokrene
    sleep 3
    
    # Prvo provjeri je li baza dostupna
    echo "🔍 Provjeravam dostupnost baze..."
    if node -e "
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: false
        });
        
        pool.query('SELECT 1')
            .then(() => {
                console.log('✅ Baza je dostupna');
                process.exit(0);
            })
            .catch(err => {
                console.error('❌ Baza nije dostupna:', err.message);
                process.exit(1);
            });
    " 2>/dev/null; then
        echo "✅ Baza je dostupna, pokrećem inicijalizaciju..."
        
        # Pokreni inicijalizaciju
        if node database/init.js; then
            echo "✅ Baza inicijalizirana!"
        else
            echo "❌ Greška pri inicijalizaciji baze"
            echo "🔄 Pokušavam s jednostavnijom inicijalizacijom..."
            simple_init
        fi
    else
        echo "❌ Baza nije dostupna, preskačem inicijalizaciju"
    fi
    cd ..
}

# Jednostavna inicijalizacija ako glavna faila
simple_init() {
    echo "🔄 Pokrećem jednostavnu inicijalizaciju baze..."
    node -e "
        const { Pool } = require('pg');
        
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: false
        });
        
        async function simpleInit() {
            const client = await pool.connect();
            try {
                // Kreiraj tablice
                await client.query(\`
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        username VARCHAR(50) UNIQUE NOT NULL,
                        email VARCHAR(100) UNIQUE NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        first_name VARCHAR(50),
                        last_name VARCHAR(50),
                        role VARCHAR(20) DEFAULT 'user',
                        email_verified BOOLEAN DEFAULT FALSE,
                        verification_token VARCHAR(255),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                \`);
                
                await client.query(\`
                    CREATE TABLE IF NOT EXISTS clients (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        email VARCHAR(100) UNIQUE NOT NULL,
                        company VARCHAR(100),
                        phone VARCHAR(20),
                        address TEXT,
                        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                \`);
                
                await client.query(\`
                    CREATE TABLE IF NOT EXISTS notes (
                        id SERIAL PRIMARY KEY,
                        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                        content TEXT NOT NULL,
                        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                \`);
                
                console.log('✅ Tablice kreirane');
                
                // Dodaj demo korisnika
                const result = await client.query(
                    'INSERT INTO users (username, email, password_hash, first_name, last_name, role, email_verified) VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7) ON CONFLICT (email) DO NOTHING RETURNING id',
                    ['demo@demo.com', 'demo@demo.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo', 'User', 'user', true]
                );
                
                if (result.rows.length > 0) {
                    console.log('✅ Demo korisnik dodan: demo@demo.com / demo123');
                } else {
                    console.log('ℹ️  Demo korisnik već postoji');
                }
                
            } catch (error) {
                console.error('❌ Greška:', error.message);
            } finally {
                client.release();
                await pool.end();
            }
        }
        
        simpleInit();
    "
}

# Funkcija za instalaciju dependencies
install_deps() {
    echo "📦 Instaliram dependencies..."
    
    cd backend
    if [ ! -d "node_modules" ]; then
        echo "Instaliram backend dependencies..."
        npm install
    else
        echo "✅ Backend dependencies već instalirani"
    fi
    cd ..
    
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "Instaliram frontend dependencies..."
        npm install
    else
        echo "✅ Frontend dependencies već instalirani"
    fi
    cd ..
}

# Funkcija za pokretanje servisa
start_services() {
    echo "🔧 Pokrećem servise..."
    
    # Zaustavi postojeće procese
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    # Postavi environment varijable za backend
    export DATABASE_URL="postgresql://crm_user:crm_password@localhost:5433/crm_demo"
    
    if [ -n "$MAILCATCHER_SMTP_PORT" ]; then
        export EMAIL_HOST="localhost"
        export EMAIL_PORT="$MAILCATCHER_SMTP_PORT"
        export EMAIL_SECURE="false"
        echo "🔧 Email konfiguriran: localhost:$MAILCATCHER_SMTP_PORT"
    else
        echo "⚠️  MailCatcher nije dostupan, email onemogućen"
    fi
    
    # Pokreni backend
    cd backend
    npm run dev &
    BACKEND_PID=$!
    echo "✅ Backend pokrenut (PID: $BACKEND_PID)"
    cd ..
    
    # Sačekaj da backend pokrene
    echo "⏳ Čekam backend (10 sekundi)..."
    sleep 10
    
    # Pokreni frontend
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    echo "✅ Frontend pokrenut (PID: $FRONTEND_PID)"
    cd ..
}

# Glavni dio
cd "$(dirname "$0")"

echo "=================================================="
echo "🔄 Pokrećem CRM Demo..."
echo "=================================================="

# Pokretanje servisa s boljim error handlingom
if ! start_postgres; then
    echo "❌ Ne mogu pokrenuti PostgreSQL, prekidam..."
    exit 1
fi

if ! start_adminer; then
    echo "⚠️  Adminer nije uspješno pokrenut, nastavljam bez njega..."
fi

if ! start_mailcatcher; then
    echo "⚠️  MailCatcher nije uspješno pokrenut, email funkcionalnost onemogućena"
    echo "💡 Savjet: Provjeri je li port 1025 zauzet ili pokušaj s: sudo lsof -i :1025"
fi

install_deps
init_database
start_services

echo " "
echo "=================================================="
echo "🎉 CRM DEMO JE POKRENUT!"
echo "=================================================="
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:8888"
echo "🗄️  PostgreSQL: localhost:5433"
echo "🛠️  Adminer: ${ADMINER_URL:-Nije pokrenut}"
if [ -n "$MAILCATCHER_WEB_URL" ]; then
    echo "📧 MailCatcher: $MAILCATCHER_WEB_URL"
else
    echo "📧 MailCatcher: Nije pokrenut"
fi
echo " "
echo "🔐 Demo login (aplikacija): demo@demo.com / demo123"
echo "🔐 Database login (Adminer):"
echo "   Server: host.docker.internal:5433"
echo "   Username: crm_user"
echo "   Password: crm_password"
echo "   Database: crm_demo"
echo " "
echo "📝 Funkcionalnosti:"
echo "   ✅ Moderni Vue 3 frontend"
echo "   ✅ Node.js backend API"
echo "   ✅ PostgreSQL baza podataka (port 5433)"
if [ -n "$ADMINER_URL" ]; then
    echo "   ✅ Adminer za upravljanje bazom"
fi
if [ -n "$MAILCATCHER_WEB_URL" ]; then
    echo "   ✅ MailCatcher za testiranje emailova"
    echo "   ✅ Email verifikacija"
else
    echo "   ⚠️  MailCatcher nije pokrenut - email onemogućen"
fi
echo "   ✅ Upravljanje klijentima (CRUD)"
echo "   ✅ Bilješke za klijente"
echo "   ✅ Statistika"
echo "   ✅ Loader između stranica"
echo " "
if [ -n "$MAILCATCHER_WEB_URL" ]; then
    echo "📧 Testiranje emailova:"
    echo "   - Svi emailovi će ići u MailCatcher"
    echo "   - Otvori $MAILCATCHER_WEB_URL za pregled"
    echo "   - Nema stvarnog slanja emailova"
    echo " "
fi
echo "🛑 Zaustavi sa: Ctrl+C"
echo "=================================================="

# Cleanup funkcija
cleanup() {
    echo " "
    echo "🛑 Zaustavljam servise..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    docker-compose down
    docker stop crm-adminer crm-mailcatcher 2>/dev/null || true
    docker rm crm-adminer crm-mailcatcher 2>/dev/null || true
    echo "✅ Zaustavljeno!"
    exit 0
}

trap cleanup INT

# Beskonačna petlja
while true; do
    sleep 60
done