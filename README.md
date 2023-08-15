## RPi install

### node 16

> is it even necessary?

```sh
  if [ "$(uname -m)" != "armv6l" ]; then
    curl -sL https://deb.nodesource.com/setup_16.x | bash -
  else
    wget -O - https://raw.githubusercontent.com/sdesalas/node-pi-zero/master/install-node-v16.3.0.sh | bash
  fi
  apt-get -y install nodejs
```

### canvas

```sh
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```
