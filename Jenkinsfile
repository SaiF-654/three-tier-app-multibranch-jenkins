pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    timestamps()
    ansiColor('xterm')
  }

  environment {
    // Credentials you must create in Jenkins (Secret text / Username+Password)
    DOCKERHUB_CREDENTIALS_ID = 'dockerhub_credentials'    // username/password binding

    // Docker Hub username (kept as non-secret for tags)
    DOCKERHUB_USER = 'saifrehman123'

    // Image tag pattern: branch-buildnumber
    IMAGE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"

    // Optional: a project prefix used in docker-compose/service names to avoid collisions
    PROJECT_PREFIX = "multibranch_${env.BRANCH_NAME}"
  }

  stages {

    stage('Checkout') {
      steps {
        // remove a stuck git lock if present (pre-check)
        sh 'rm -f .git/index.lock || true'
        checkout scm
      }
    }

    stage('Pre-clean: Remove old workspace artifacts') {
      steps {
        sh '''
          echo "Cleaning old temporary files and logs..."
          # remove node_modules/build caches from previous failed runs if any (optional, safe)
          rm -rf frontend/build || true
          rm -rf backend/node_modules || true
        '''
      }
    }

    stage('Docker Hub Login') {
      steps {
        withCredentials([usernamePassword(credentialsId: "${DOCKERHUB_CREDENTIALS_ID}", usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          sh '''
            echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
          '''
        }
      }
    }

    stage('Clean Old Containers & Networks') {
      steps {
        sh '''
          echo "Stopping and removing old containers from previous runs..."

          # Try docker-compose down first (if compose file exists)
          docker-compose --env-file .env down --remove-orphans || true

          # Remove containers that match project prefix (extra safety)
          OLD_CONTAINERS=$(docker ps -aq --filter "name=${PROJECT_PREFIX}") || true
          if [ -n "$OLD_CONTAINERS" ]; then
            docker stop $OLD_CONTAINERS || true
            docker rm -f $OLD_CONTAINERS || true
          fi

          # Remove dangling networks and volumes created by previous runs
          docker network prune -f || true
          docker volume prune -f || true
        '''
      }
    }

    stage('Build Docker Images') {
      steps {
        script {
          env.BACKEND_TAG = "${env.DOCKERHUB_USER}/three-tier-app-backend:${env.IMAGE_TAG}"
          env.FRONTEND_TAG = "${env.DOCKERHUB_USER}/three-tier-app-frontend:${env.IMAGE_TAG}"
        }
        sh '''
          set -o pipefail

          echo "Building backend image: ${BACKEND_TAG}"
          docker build -t ${BACKEND_TAG} ./backend || { echo 'Backend build failed'; exit 1; }

          echo "Building frontend image: ${FRONTEND_TAG}"
          docker build -t ${FRONTEND_TAG} ./frontend || { echo 'Frontend build failed'; exit 1; }
        '''
      }
    }

    stage('Push Images to Docker Hub') {
      steps {
        sh '''
          echo "Pushing ${BACKEND_TAG}"
          docker push ${BACKEND_TAG}

          echo "Pushing ${FRONTEND_TAG}"
          docker push ${FRONTEND_TAG}
        '''
      }
    }

    stage('Prepare .env for Compose') {
      steps {
        script {
          writeFile file: '.env', text: """
BACKEND_IMAGE=${env.BACKEND_TAG}
FRONTEND_IMAGE=${env.FRONTEND_TAG}
PROJECT_PREFIX=${env.PROJECT_PREFIX}
"""
        }
        sh 'cat .env'
      }
    }

    stage('Approval for Staging/Prod') {
      when {
        anyOf {
          branch 'stg'
          branch 'prod'
        }
      }
      steps {
        input message: "Deploy to ${env.BRANCH_NAME} environment?", ok: 'Yes, deploy'
      }
    }

    stage('Deploy with Docker Compose') {
      steps {
        sh '''
          set -o pipefail

          echo "Ensuring old containers are stopped (one more time)..."
          docker-compose --env-file .env down --remove-orphans || true

          echo "Pull (ensure images are available)"
          docker-compose --env-file .env pull || true

          echo "Starting services"
          docker-compose --env-file .env up -d --remove-orphans --build

          # Wait for a couple of seconds and show container status
          sleep 5
          docker ps --filter "name=${PROJECT_PREFIX}"
        '''
      }
    }

    stage('Post-deploy Cleanup') {
      steps {
        sh '''
          echo "Cleaning local images to free disk (optional)"
          docker image prune -f || true

          # Remove the images we just built locally if you don't want them stored on CI runner
          docker rmi ${BACKEND_TAG} ${FRONTEND_TAG} || true
        '''
      }
    }

    stage('System Health Checks') {
      steps {
        sh '''
          echo "Disk usage summary:" && df -h || true
          echo "Docker disk usage:" && docker system df || true
        '''
      }
    }
  }

  post {
    success {
      echo "✅ Deployment for ${env.BRANCH_NAME} succeeded"
    }
    failure {
      echo "❌ Deployment for ${env.BRANCH_NAME} failed — gathering debug info"
      sh '''
        echo "Last 200 lines of docker logs for app containers (if any):"
        docker ps -a --filter "name=${PROJECT_PREFIX}" --format '{{.ID}}' | xargs -r docker logs --tail 200 || true

        echo "Jenkins workspace disk usage:" && du -sh . || true
      '''
    }
    always {
      // optional: logout from dockerhub
      sh 'docker logout || true'
    }
  }
}
